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
import { lookupCityByPincode, normalizePincode } from "./pincodeCityLookup";

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

const asDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  if (typeof value === "object") {
    const mongoDate = value?.$date || value?.date || value?.value;
    if (mongoDate) {
      const md = dayjs(mongoDate);
      return md.isValid() ? md : null;
    }
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const PersonalDetailsPreFile = () => {
  const form = Form.useFormInstance();

  // Watches
  const applicantType = Form.useWatch("applicantType", form);
  const identityType = Form.useWatch("identityProofType", form);
  const addressProofType = Form.useWatch("addressProofType", form);
  const sameAsCurrent = Form.useWatch("sameAsCurrentAddress", form);
  const pincode = Form.useWatch("pincode", form);
  const permanentPincode = Form.useWatch("permanentPincode", form);
  const dob = Form.useWatch("dob", form);
  const employmentAddress = Form.useWatch("employmentAddress", form);
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const employmentCity = Form.useWatch("employmentCity", form);
  const employmentPhone = Form.useWatch("employmentPhone", form);
  const officialEmail = Form.useWatch("officialEmail", form);
  const primaryMobile = Form.useWatch("primaryMobile", form);
  const aadhaarNumber = Form.useWatch("aadhaarNumber", form);
  const aadharNumber = Form.useWatch("aadharNumber", form);
  const passportNumber = Form.useWatch("passportNumber", form);
  const dlNumber = Form.useWatch("dlNumber", form);
  const isCompany = applicantType === "Company";

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

  const resolveProofNumber = React.useCallback((type) => {
    if (type === "AADHAAR") {
      return aadhaarNumber || aadharNumber || form.getFieldValue("aadhaarNumber") || form.getFieldValue("aadharNumber") || "";
    }
    if (type === "PASSPORT") {
      return passportNumber || form.getFieldValue("passportNumber") || "";
    }
    if (type === "DRIVING_LICENSE") {
      return dlNumber || form.getFieldValue("dlNumber") || "";
    }
    return "";
  }, [aadhaarNumber, aadharNumber, passportNumber, dlNumber, form]);

  // Pincode Fetching (Current)
  useEffect(() => {
    const pin = normalizePincode(pincode);
    if (!pin) return;
    let cancelled = false;
    const fetchCity = async () => {
      try {
        setFetchingPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ city });
        }
      } finally {
        if (!cancelled) setFetchingPincode(false);
      }
    };
    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pincode, form]);

  // Pincode Fetching (Permanent)
  useEffect(() => {
    const pin = normalizePincode(permanentPincode);
    if (!pin) return;
    let cancelled = false;
    const fetchCity = async () => {
      try {
        setFetchingPermanentPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ permanentCity: city });
        }
      } finally {
        if (!cancelled) setFetchingPermanentPincode(false);
      }
    };
    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [permanentPincode, form]);

  // Identity proof number auto-fill from selected proof type.
  useEffect(() => {
    const val = resolveProofNumber(identityType);
    if (val) {
      form.setFieldsValue({ identityProofNumber: val });
    }
  }, [identityType, resolveProofNumber, form]);

  // Address proof number auto-fill from selected address proof type.
  useEffect(() => {
    const val = resolveProofNumber(addressProofType);
    if (val) {
      form.setFieldsValue({ addressProofNumber: val });
    }
  }, [addressProofType, resolveProofNumber, form]);

  // Company cases use business contact details and must always have a co-applicant.
  useEffect(() => {
    if (!isCompany) return;

    const current = form.getFieldsValue([
      "residenceAddress",
      "pincode",
      "city",
      "primaryMobile",
      "email",
      "hasCoApplicant",
    ]);
    const patch = { hasCoApplicant: true };

    if (!current.residenceAddress && employmentAddress) {
      patch.residenceAddress = employmentAddress;
    }
    if (!current.pincode && employmentPincode) {
      patch.pincode = employmentPincode;
    }
    if (!current.city && employmentCity) {
      patch.city = employmentCity;
    }
    if (!current.primaryMobile && employmentPhone) {
      patch.primaryMobile = employmentPhone;
    }
    if (!current.email && officialEmail) {
      patch.email = officialEmail;
    }

    if (Object.keys(patch).length > 0) {
      form.setFieldsValue(patch);
    }
  }, [
    isCompany,
    form,
    employmentAddress,
    employmentPincode,
    employmentCity,
    employmentPhone,
    officialEmail,
  ]);

  useEffect(() => {
    if (!isCompany) return;
    if (primaryMobile) return;
    const fallbackMobile =
      form.getFieldValue("mobileNo") || form.getFieldValue("customerMobile") || employmentPhone;
    if (fallbackMobile) {
      form.setFieldsValue({ primaryMobile: fallbackMobile });
    }
  }, [isCompany, primaryMobile, employmentPhone, form]);

  return (
    <div style={{ background: "var(--card)", padding: 20, borderRadius: 12, border: "2px solid var(--border)", marginBottom: 24 }}>
      <Space className="section-header" style={{ marginBottom: 20 }}>
        <IdcardOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {isCompany ? "Company Details" : "Personal Details"}
        </span>
      </Space>

      <Row gutter={[16, 0]}>
        {/* Row 1 */}
        <Col xs={24} md={8}><Form.Item label={isCompany ? "Company Name" : "Customer Name"} name="customerName"><Input disabled prefix={<UserOutlined />} /></Form.Item></Col>
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Mother's Name" name="motherName"><Input placeholder="Mother's Name" /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Father / Husband Name" name="sdwOf"><Input placeholder="Father/Husband Name" /></Form.Item></Col>}

        {/* Row 2 */}
        <Col xs={24} md={8}>
          <Form.Item label={isCompany ? "Date of Incorporation" : "Date of Birth"} name="dob">
            <DatePicker
              style={{ width: "100%" }}
              getValueProps={(value) => ({ value: asDayjs(value) })}
              suffixIcon={!isCompany && calculatedAge !== null ? <span style={{fontSize: '10px', color: '#888'}}>Age: {calculatedAge}</span> : null}
            />
          </Form.Item>
        </Col>
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Gender" name="gender"><Select options={[{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }]} /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Marital Status" name="maritalStatus"><Select options={[{ label: "Married", value: "Married" }, { label: "Unmarried", value: "Unmarried" }]} /></Form.Item></Col>}

        {/* Row 3 */}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="No. of Dependents" name="dependents"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>}
        {!isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Education" name="education">
              <Select options={[{ label: "Undergraduate", value: "Undergraduate" }, { label: "Graduate", value: "Graduate" }, { label: "Post Graduate & above", value: "Postgraduate" }, { label: "Others", value: "Others" }]} />
            </Form.Item>
          </Col>
        )}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="House" name="houseType"><Select options={HOUSE_TYPE_OPTIONS} /></Form.Item></Col>}

        {/* Row 4 */}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Address Type" name="addressType"><Select options={ADDRESS_TYPE_OPTIONS} /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Identity Proof" name="identityProofType"><Select options={IDENTITY_OPTIONS} /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Identity Proof Number" name="identityProofNumber"><Input /></Form.Item></Col>}

        {/* Conditional Expiry Row */}
        {!isCompany && (identityType === "PASSPORT" || identityType === "DRIVING_LICENSE") && (
          <Col xs={24} md={8}><Form.Item label="Identity Proof Expiry" name="identityProofExpiry"><DatePicker style={{ width: "100%" }} getValueProps={(value) => ({ value: asDayjs(value) })} /></Form.Item></Col>
        )}

        {/* Row 5: Current Address */}
        <Col xs={24} md={8}><Form.Item label="Present Address" name="residenceAddress"><TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={isCompany ? "Office address" : "Address"} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label={isCompany ? "Present Pincode" : "Pincode"} name="pincode"><Input maxLength={6} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label={isCompany ? "Present City" : "City"} name="city"><Input suffix={fetchingPincode ? "..." : null} /></Form.Item></Col>

        {/* Row 6 */}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Years at current City" name="yearsInCurrentCity"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Years at current Residence" name="yearsInCurrentHouse"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>}

        <Col xs={24} md={8}>
          <Form.Item label="Primary Mobile" name="primaryMobile">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
        </Col>

        <Form.List name="extraMobiles">
          {(fields, { add, remove }) => (
            <>
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

              {fields.length === 0 && (
                <Col xs={24} md={8}>
                  <Form.Item label="Additional Mobile">
                    <Input
                      disabled
                      placeholder="Add alternative mobile"
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
              )}
            </>
          )}
        </Form.List>

        <Col xs={24} md={8}><Form.Item label="Email ID" name="email" rules={[{ type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
        {isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Contact Person Name" name="contactPersonName">
              <Input placeholder="Enter contact person name" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
        )}
        {isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Contact Person Mobile" name="contactPersonMobile">
              <Input placeholder="Enter contact person mobile" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        )}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Address Proof (type)" name="addressProofType"><Select options={ADDRESS_PROOF_OPTIONS} /></Form.Item></Col>}
        {!isCompany && <Col xs={24} md={8}><Form.Item label="Address Proof Number" name="addressProofNumber"><Input /></Form.Item></Col>}

        {/* Row 8 */}
        <Col xs={24} md={8}><Form.Item label="Permanent Address is same as the current Address?" name="sameAsCurrentAddress" valuePropName="checked"><Switch /></Form.Item></Col>

        {!sameAsCurrent && (
          <>
            <Col xs={24} md={8}><Form.Item label="Permanent Address" name="permanentAddress"><TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Permanent Pincode" name="permanentPincode"><Input maxLength={6} suffix={fetchingPermanentPincode ? "..." : null} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Permanent City" name="permanentCity"><Input /></Form.Item></Col>
          </>
        )}

        {/* Final Row */}
        <Col xs={24} md={8}><Form.Item label="Is Co-Applicant Applicable" name="hasCoApplicant" valuePropName="checked"><Switch disabled={isCompany} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Is Guarantor Applicable" name="hasGuarantor" valuePropName="checked"><Switch /></Form.Item></Col>
      </Row>
    </div>
  );
};

export default PersonalDetailsPreFile;
