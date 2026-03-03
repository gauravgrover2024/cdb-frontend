import {
  PhoneOutlined,
  SolutionOutlined,
  TeamOutlined
} from "@ant-design/icons";
import {
  AutoComplete,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";
import { BUSINESS_NATURE_OPTIONS, COMPANY_TYPE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";

const { Option } = Select;
const asDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const GuarantorSection = () => {
  const form = Form.useFormInstance();
  const hasGuarantor = Form.useWatch("hasGuarantor", form);
  const occupation = Form.useWatch("gu_occupation", form);
  const guCompanyType = Form.useWatch("gu_companyType", form);
  const guBusinessNature = Form.useWatch("gu_businessNature", form);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, guCompanyType);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, guBusinessNature);

  const handleCustomerSelect = (customer) => {
    const mappedFields = mapCustomerToPersonFields(customer, "gu");
    form.setFieldsValue(mappedFields);
  };

  if (!hasGuarantor) return null;

  const isSalaried = occupation === "Salaried";
  const isSelfEmployed = occupation === "Self Employed";
  const isProfessional = occupation === "Self Employed Professional";
  const sectionLabelClass =
    "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground";
  const fieldClass = "h-10 rounded-lg w-full";

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <TeamOutlined className="text-[18px] text-foreground" />
        </div>
        <span className="text-base text-foreground">Guarantor Details</span>
      </div>

      {/* ================= PERSONAL DETAILS ================= */}
      <div className="mb-4 mt-6 flex items-center gap-2">
        <SolutionOutlined className="text-[12px] text-muted-foreground" />
        <span className={sectionLabelClass}>Personal Details</span>
      </div>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Customer ID" name="gu_id">
            <Input disabled placeholder="Auto-filled" className={`${fieldClass} bg-muted/30`} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Name" name="gu_customerName">
            <CustomerQuickSearch
              onSelect={handleCustomerSelect}
              placeholder="Search or Enter Name"
              className={fieldClass}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="gu_motherName">
            <Input className={fieldClass} placeholder="Name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Father / Husband Name" name="gu_fatherName">
            <Input className={fieldClass} placeholder="Name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="DOB" name="gu_dob">
            <DatePicker style={{ width: "100%" }} className={fieldClass} getValueProps={(value) => ({ value: asDayjs(value) })} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="gu_gender">
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
          <Form.Item label="Marital Status" name="gu_maritalStatus">
            <Select
              className={fieldClass}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="Married">Married</Option>
              <Option value="Unmarried">Unmarried</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Dependents" name="gu_dependents">
            <InputNumber className={fieldClass} style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Education" name="gu_education">
            <Select
              className={fieldClass}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="Graduate">Graduate</Option>
              <Option value="Post Graduate">Post Graduate</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="House" name="gu_houseType">
            <Select
              className={fieldClass}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="Owned">Owned</Option>
              <Option value="Rented">Rented</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Mobile"
            name="gu_primaryMobile"
            rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
          >
            <Input maxLength={10} className={fieldClass} prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="10-digit number" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="Address" name="gu_address">
            <Input className={fieldClass} placeholder="House no, Street, Area" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="gu_pincode">
            <Input className={fieldClass} maxLength={6} placeholder="6-digit PIN" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="City" name="gu_city">
            <Input className={fieldClass} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="PAN" name="gu_pan">
            <Input className={fieldClass} placeholder="ABCDE1234F" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar" name="gu_aadhaar">
            <Input className={fieldClass} placeholder="1234 5678 9012" />
          </Form.Item>
        </Col>
      </Row>

      {/* ================= OCCUPATIONAL DETAILS ================= */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <SolutionOutlined className="text-[12px] text-muted-foreground" />
        <span className={sectionLabelClass}>Occupational Details</span>
      </div>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Occupation" name="gu_occupation">
            <Select
              className={fieldClass}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
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

        {/* Professional Type */}
        {isProfessional && (
          <Col xs={24} md={8}>
            <Form.Item label="Professional Type" name="gu_professionalType">
              <Select
                className={fieldClass}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
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

        {/* Company Type */}
        {(isSalaried || isSelfEmployed || isProfessional) && (
          <Col xs={24} md={8}>
            <Form.Item label="Type of Company" name="gu_companyType">
              <AutoComplete
                className={fieldClass}
                placeholder="Select or type"
                allowClear
                options={companyTypeOptions}
                filterOption={(input, option) =>
                  (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        )}

        {/* Nature of Business */}
        {(isSalaried || isSelfEmployed || isProfessional) && (
          <Col xs={24} md={8}>
            <Form.Item label="Nature of Business" name="gu_businessNature">
              <AutoComplete
                className={fieldClass}
                placeholder="Select or type"
                allowClear
                options={businessNatureOptions}
                filterOption={(input, option) =>
                  (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        )}
      </Row>

      {/* EMPLOYER / BUSINESS DETAIL HEADER */}
      {(isSalaried || isSelfEmployed || isProfessional) && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8 opacity-80">
            <SolutionOutlined className="text-[12px] text-muted-foreground" />
            <span className={sectionLabelClass}>Employer / Business Details</span>
          </div>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label="Designation" name="gu_designation">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Current Exp (Years)"
                name="gu_currentExperience"
              >
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Total Exp (Years)" name="gu_totalExperience">
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Company Name" name="gu_companyName">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Company Address" name="gu_companyAddress">
                <Input className={fieldClass} placeholder="Full Business Address" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Pin Code" name="gu_companyPincode">
                <Input className={fieldClass} maxLength={6} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="City" name="gu_companyCity">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Phone No" name="gu_companyPhone">
                <Input className={fieldClass} prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default GuarantorSection;
