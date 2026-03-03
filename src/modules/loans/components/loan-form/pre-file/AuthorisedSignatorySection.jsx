import {
  PhoneOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined
} from "@ant-design/icons";
import {
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Switch,
} from "antd";
import { useEffect } from "react";
import dayjs from "dayjs";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";

const { Option } = Select;
const asDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const AuthorisedSignatorySection = () => {
  const form = Form.useFormInstance();

  const applicantType = Form.useWatch("applicantType", form);
  const sameAsCoApplicant = Form.useWatch("signatorySameAsCoApplicant", form);
  const coCustomerName = Form.useWatch("co_customerName", form);
  const coPrimaryMobile = Form.useWatch("co_primaryMobile", form);
  const coAddress = Form.useWatch("co_address", form);
  const coPincode = Form.useWatch("co_pincode", form);
  const coCity = Form.useWatch("co_city", form);
  const coDob = Form.useWatch("co_dob", form);
  const coGender = Form.useWatch("co_gender", form);
  const coPan = Form.useWatch("co_pan", form);
  const coAadhaar = Form.useWatch("co_aadhaar", form);
  const coDesignation = Form.useWatch("co_designation", form);
  const sectionLabelClass =
    "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground";
  const fieldClass = "h-10 rounded-lg w-full";

  const handleCustomerSelect = (customer) => {
    const mappedFields = mapCustomerToPersonFields(customer, "signatory");
    form.setFieldsValue(mappedFields);
  };

  useEffect(() => {
    if (!sameAsCoApplicant) return;
      form.setFieldsValue({
        signatory_customerName: coCustomerName || "",
        signatory_primaryMobile: coPrimaryMobile || "",
        signatory_address: coAddress || "",
        signatory_pincode: coPincode || "",
        signatory_city: coCity || "",
        signatory_dob: coDob || null,
        signatory_gender: coGender || undefined,
        signatory_pan: coPan || "",
        signatory_aadhaar: coAadhaar || "",
        signatory_designation: coDesignation || "",
      });
  }, [
    sameAsCoApplicant,
    coCustomerName,
    coPrimaryMobile,
    coAddress,
    coPincode,
    coCity,
    coDob,
    coGender,
    coPan,
    coAadhaar,
    coDesignation,
    form,
  ]);

  useEffect(() => {
    if (applicantType !== "Company") return;
    if (sameAsCoApplicant !== undefined) return;
    if (coCustomerName || coPrimaryMobile) {
      form.setFieldsValue({ signatorySameAsCoApplicant: true });
    }
  }, [applicantType, sameAsCoApplicant, coCustomerName, coPrimaryMobile, form]);

  // Render ONLY for company applicant
  if (applicantType !== "Company") return null;

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <SafetyCertificateOutlined className="text-[18px] text-foreground" />
        </div>
        <span className="text-base text-foreground">Authorised Signatory Details</span>
      </div>

      {/* ================= PERSONAL DETAILS ================= */}
      <div className="mb-4 mt-6 flex items-center gap-2">
        <SolutionOutlined className="text-[12px] text-muted-foreground" />
        <span className={sectionLabelClass}>Personal Details</span>
      </div>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Same as Co-Applicant" name="signatorySameAsCoApplicant" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Customer ID" name="signatory_id">
            <Input disabled placeholder="Auto-filled" className={`${fieldClass} bg-muted/30`} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Applicant Name" name="signatory_customerName">
            <CustomerQuickSearch
              onSelect={handleCustomerSelect}
              placeholder="Search or Enter Name"
              className={fieldClass}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Primary Mobile"
            name="signatory_primaryMobile"
            rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
          >
            <Input maxLength={10} className={fieldClass} prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="10-digit number" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="Present / Current Address" name="signatory_address">
            <Input className={fieldClass} placeholder="House no, Street, Area" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="signatory_pincode">
            <Input className={fieldClass} maxLength={6} placeholder="6-digit PIN" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="City" name="signatory_city">
            <Input className={fieldClass} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Date of Birth" name="signatory_dob">
            <DatePicker style={{ width: "100%" }} className={fieldClass} getValueProps={(value) => ({ value: asDayjs(value) })} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="signatory_gender">
            <Select
              className={fieldClass}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Designation" name="signatory_designation">
            <Input className={fieldClass} placeholder="e.g. Director" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="PAN Number" name="signatory_pan">
            <Input className={fieldClass} placeholder="ABCDE1234F" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar Number" name="signatory_aadhaar">
            <Input className={fieldClass} placeholder="1234 5678 9012" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default AuthorisedSignatorySection;
