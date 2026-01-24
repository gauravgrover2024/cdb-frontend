import React, { useEffect } from "react";
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
  Button,
} from "antd";
import {
  UserOutlined,
  IdcardOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
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

  // watches
  const identityType = Form.useWatch("identityProofType", form);
  const addressProofType = Form.useWatch("addressProofType", form);
  const sameAsCurrent = Form.useWatch("sameAsCurrentAddress", form);

  /* ====================================================
     Helper: pull kyc fields safely (may be empty / undefined)
  ==================================================== */
  const getKycValues = () => {
    return {
      aadhaar: form.getFieldValue("aadhaarNumber") || "",
      passport: form.getFieldValue("passportNumber") || "",
      dl: form.getFieldValue("dlNumber") || "",
    };
  };

  /* ===============================
     IDENTITY PROOF: auto-populate number from KYC
  =============================== */
  useEffect(() => {
    const kyc = getKycValues();
    if (identityType === "AADHAAR") {
      form.setFieldsValue({ identityProofNumber: kyc.aadhaar || "" });
    } else if (identityType === "PASSPORT") {
      form.setFieldsValue({ identityProofNumber: kyc.passport || "" });
    } else if (identityType === "DRIVING_LICENSE") {
      form.setFieldsValue({ identityProofNumber: kyc.dl || "" });
    } else {
      form.setFieldsValue({ identityProofNumber: "" });
    }
  }, [identityType, form]);

  /* ===============================
     ADDRESS PROOF: auto-populate number from KYC (similar to identity)
  =============================== */
  useEffect(() => {
    const kyc = getKycValues();
    if (addressProofType === "AADHAAR") {
      form.setFieldsValue({ addressProofNumber: kyc.aadhaar || "" });
    } else if (addressProofType === "PASSPORT") {
      form.setFieldsValue({ addressProofNumber: kyc.passport || "" });
    } else if (addressProofType === "DRIVING_LICENSE") {
      form.setFieldsValue({ addressProofNumber: kyc.dl || "" });
    } else {
      form.setFieldsValue({ addressProofNumber: "" });
    }
  }, [addressProofType, form]);

  /* ===============================
     PERMANENT ADDRESS toggle logic (fixed)
     - When toggle = true: copy from current (can be blank)
     - When toggle = false: clear permanent fields and show manual inputs
  =============================== */
  useEffect(() => {
    const curAddress = form.getFieldValue("residenceAddress") || "";
    const curPincode = form.getFieldValue("pincode") || "";
    const curCity = form.getFieldValue("city") || "";

    if (sameAsCurrent) {
      // copy values (if empty, will still set empty so fields show content or blank)
      form.setFieldsValue({
        permanentAddress: curAddress,
        permanentPincode: curPincode,
        permanentCity: curCity,
      });
    } else {
      // user wants to manually enter permanent address → clear to force manual entry
      form.setFieldsValue({
        permanentAddress: "",
        permanentPincode: "",
        permanentCity: "",
      });
    }
  }, [sameAsCurrent, form]);

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #f0f0f0",
        marginBottom: 24,
      }}
    >
      {/* HEADER */}
      <Space style={{ marginBottom: 20 }}>
        <IdcardOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>Personal Details</span>
      </Space>

      <Row gutter={[16, 16]}>
        {/* Row 1: Basic */}
        <Col xs={24} md={8}>
          <Form.Item label="Customer Name" name="customerName">
            <Input disabled prefix={<UserOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="motherName">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Father / Husband Name" name="sdwOf">
            <Input />
          </Form.Item>
        </Col>

        {/* Row 2: DOB / Gender / Marital */}
        <Col xs={24} md={6}>
          <Form.Item label="Date of Birth" name="dob">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Gender" name="gender">
            <Select
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
              ]}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Marital Status" name="maritalStatus">
            <Select
              options={[
                { label: "Married", value: "Married" },
                { label: "Unmarried", value: "Unmarried" },
              ]}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="No. of Dependents" name="dependents">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        {/* Row 3: Education / House / Address Type */}
        <Col xs={24} md={8}>
          <Form.Item label="Education" name="education">
            <Select
              options={[
                { label: "Undergraduate", value: "Undergraduate" },
                { label: "Graduate", value: "Graduate" },
                { label: "Post Graduate & above", value: "Postgraduate" },
                { label: "Others", value: "Others" },
              ]}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="House" name="houseType">
            <Select options={HOUSE_TYPE_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Address Type" name="addressType">
            <Select options={ADDRESS_TYPE_OPTIONS} />
          </Form.Item>
        </Col>

        {/* Row 4: Identity proof */}
        <Col xs={24} md={8}>
          <Form.Item label="Identity Proof" name="identityProofType">
            <Select options={IDENTITY_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Identity Proof Number" name="identityProofNumber">
            <Input />
          </Form.Item>
        </Col>

        {(identityType === "PASSPORT" ||
          identityType === "DRIVING_LICENSE") && (
          <Col xs={24} md={8}>
            <Form.Item label="Identity Proof Expiry" name="identityProofExpiry">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        )}

        {/* Row 5: Current address */}
        <Col span={24}>
          <Form.Item label="Present / Current Address" name="residenceAddress">
            <TextArea rows={2} prefix={<HomeOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Pincode" name="pincode">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="City" name="city">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Years at current City" name="yearsInCurrentCity">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="Years at current Residence"
            name="yearsInCurrentHouse"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        {/* Row 6: Mobile numbers + Email */}
        <Col xs={24} md={8}>
          <Form.Item label="Primary Mobile" name="primaryMobile">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.List name="extraMobiles">
            {(fields, { add, remove }) => (
              <div>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Additional Mobile(s)
                </label>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="start">
                      <Form.Item {...field} style={{ marginBottom: 0 }}>
                        <Input style={{ width: 260 }} placeholder="Mobile" />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        onClick={() => remove(field.name)}
                      >
                        Remove
                      </Button>
                    </Space>
                  ))}

                  <Button type="dashed" onClick={() => add()}>
                    + Add mobile
                  </Button>
                </Space>
              </div>
            )}
          </Form.List>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Email ID" name="email">
            <Input prefix={<MailOutlined />} />
          </Form.Item>
        </Col>

        {/* Row 7: Address Proof */}
        <Col xs={24} md={8}>
          <Form.Item label="Address Proof (type)" name="addressProofType">
            <Select options={ADDRESS_PROOF_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Address Proof Number" name="addressProofNumber">
            <Input />
          </Form.Item>
        </Col>

        {/* Row 8: Permanent address toggle + fields */}
        <Col xs={24} md={12}>
          <Form.Item
            label="Permanent address same as current address?"
            name="sameAsCurrentAddress"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>

        {/* When toggle = NO (sameAsCurrent false) show manual inputs.
            When toggle = YES fields will be populated automatically above via effect.
         */}
        {!sameAsCurrent && (
          <>
            <Col span={24}>
              <Form.Item label="Permanent Address" name="permanentAddress">
                <TextArea rows={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item label="Permanent Pincode" name="permanentPincode">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item label="Permanent City" name="permanentCity">
                <Input />
              </Form.Item>
            </Col>
          </>
        )}

        {/* Row 9: Co-applicant & Guarantor toggles */}
        <Col xs={24} md={6}>
          <Form.Item
            label="Is Co-Applicant Applicable"
            name="hasCoApplicant"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="Is Guarantor Applicable"
            name="hasGuarantor"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default PersonalDetailsPreFile;
