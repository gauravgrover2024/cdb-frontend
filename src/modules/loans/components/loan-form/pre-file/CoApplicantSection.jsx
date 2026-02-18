import {
  PhoneOutlined,
  SolutionOutlined,
  TeamOutlined,
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
import { BUSINESS_NATURE_OPTIONS, COMPANY_TYPE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";

const { Option } = Select;

const CoApplicantSection = () => {
  const form = Form.useFormInstance();
  const hasCoApplicant = Form.useWatch("hasCoApplicant", form);
  const occupation = Form.useWatch("co_occupation", form);
  const coCompanyType = Form.useWatch("co_companyType", form);
  const coBusinessNature = Form.useWatch("co_businessNature", form);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, coCompanyType);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, coBusinessNature);

  const handleCustomerSelect = (customer) => {
    const mappedFields = mapCustomerToPersonFields(customer, "co");
    form.setFieldsValue(mappedFields);
  };

  if (!hasCoApplicant) return null;

  const isSalaried = occupation === "Salaried";
  const isSelfEmployed = occupation === "Self Employed";
  const isProfessional = occupation === "Self Employed Professional";

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <TeamOutlined className="text-purple-600" />
        </div>
        <span className="text-base text-foreground">Co-Applicant Details</span>
      </div>

      {/* ================= PERSONAL DETAILS ================= */}
      <div className="flex items-center gap-2 mb-4 mt-6 opacity-80">
        <SolutionOutlined className="text-primary text-xs" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
      </div>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Customer ID" name="co_id">
            <Input disabled placeholder="Auto-filled" className="h-10 rounded-lg bg-muted/30" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Name" name="co_customerName">
            <CustomerQuickSearch
              onSelect={handleCustomerSelect}
              placeholder="Search or Enter Name"
              className="h-10 rounded-lg"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="co_motherName">
            <Input className="h-10 rounded-lg" placeholder="Name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Father / Husband Name" name="co_fatherName">
            <Input className="h-10 rounded-lg" placeholder="Name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="DOB" name="co_dob">
            <DatePicker style={{ width: "100%" }} className="h-10 rounded-lg" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="co_gender">
            <Select
              className="h-10 rounded-lg"
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
          <Form.Item label="Marital Status" name="co_maritalStatus">
            <Select
              className="h-10 rounded-lg"
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
          <Form.Item label="Dependents" name="co_dependents">
            <InputNumber className="h-10 rounded-lg flex items-center" style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Education" name="co_education">
            <Select
              className="h-10 rounded-lg"
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
          <Form.Item label="House" name="co_houseType">
            <Select
              className="h-10 rounded-lg"
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
            name="co_primaryMobile"
            rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
          >
            <Input maxLength={10} className="h-10 rounded-lg" prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="10-digit number" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="Address" name="co_address">
            <Input className="h-10 rounded-lg" placeholder="House no, Street, Area" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="co_pincode">
            <Input className="h-10 rounded-lg" maxLength={6} placeholder="6-digit PIN" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="City" name="co_city">
            <Input className="h-10 rounded-lg" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="PAN" name="co_pan">
            <Input className="h-10 rounded-lg" placeholder="ABCDE1234F" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar" name="co_aadhaar">
            <Input className="h-10 rounded-lg" placeholder="1234 5678 9012" />
          </Form.Item>
        </Col>
      </Row>

      {/* ================= OCCUPATIONAL DETAILS ================= */}
      <div className="flex items-center gap-2 mb-4 mt-8 opacity-80">
        <SolutionOutlined className="text-primary text-xs" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Occupational Details</span>
      </div>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Occupation" name="co_occupation">
            <Select
              className="h-10 rounded-lg"
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
            <Form.Item label="Professional Type" name="co_professionalType">
              <Select
                className="h-10 rounded-lg"
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
            <Form.Item label="Type of Company" name="co_companyType">
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
        )}

        {/* Nature of Business */}
        {(isSalaried || isSelfEmployed || isProfessional) && (
          <Col xs={24} md={8}>
            <Form.Item label="Nature of Business" name="co_businessNature">
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
        )}
      </Row>

      {/* EMPLOYER / BUSINESS DETAIL HEADER */}
      {(isSalaried || isSelfEmployed || isProfessional) && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8 opacity-80">
            <SolutionOutlined className="text-primary text-xs" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employer / Business Details</span>
          </div>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label="Designation" name="co_designation">
                <Input className="h-10 rounded-lg" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Current Exp (Years)"
                name="co_currentExperience"
              >
                <Input className="h-10 rounded-lg" placeholder="Years" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Total Exp (Years)" name="co_totalExperience">
                <Input className="h-10 rounded-lg" placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Company Name" name="co_companyName">
                <Input className="h-10 rounded-lg" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Company Address" name="co_companyAddress">
                <Input className="h-10 rounded-lg" placeholder="Full Business Address" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Pin Code" name="co_companyPincode">
                <Input className="h-10 rounded-lg" maxLength={6} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="City" name="co_companyCity">
                <Input className="h-10 rounded-lg" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Phone No" name="co_companyPhone">
                <Input className="h-10 rounded-lg" prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default CoApplicantSection;
