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
} from "antd";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";

const { Option } = Select;

const AuthorisedSignatorySection = () => {
  const form = Form.useFormInstance();

  const applicantType = Form.useWatch("applicantType", form);

  const handleCustomerSelect = (customer) => {
    const mappedFields = mapCustomerToPersonFields(customer, "signatory");
    form.setFieldsValue(mappedFields);
  };

  // Render ONLY for company applicant
  if (applicantType !== "Company") return null;

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <SafetyCertificateOutlined className="text-purple-600" />
        </div>
        <span className="text-base text-foreground">Authorised Signatory Details</span>
      </div>

      {/* ================= PERSONAL DETAILS ================= */}
      <div className="flex items-center gap-2 mb-4 mt-6 opacity-80">
        <SolutionOutlined className="text-primary text-xs" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
      </div>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Customer ID" name="signatory_id">
            <Input disabled placeholder="Auto-filled" className="h-10 rounded-lg bg-muted/30" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Applicant Name" name="signatory_customerName">
            <CustomerQuickSearch
              onSelect={handleCustomerSelect}
              placeholder="Search or Enter Name"
              className="h-10 rounded-lg"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Primary Mobile"
            name="signatory_primaryMobile"
            rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
          >
            <Input maxLength={10} className="h-10 rounded-lg" prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="10-digit number" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="Present / Current Address" name="signatory_address">
            <Input className="h-10 rounded-lg" placeholder="House no, Street, Area" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="signatory_pincode">
            <Input className="h-10 rounded-lg" maxLength={6} placeholder="6-digit PIN" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="City" name="signatory_city">
            <Input className="h-10 rounded-lg" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Date of Birth" name="signatory_dob">
            <DatePicker style={{ width: "100%" }} className="h-10 rounded-lg" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="signatory_gender">
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
          <Form.Item label="Designation" name="designation">
            <Input className="h-10 rounded-lg" placeholder="e.g. Director" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="PAN Number" name="signatory_pan">
            <Input className="h-10 rounded-lg" placeholder="ABCDE1234F" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar Number" name="signatory_aadhaar">
            <Input className="h-10 rounded-lg" placeholder="1234 5678 9012" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default AuthorisedSignatorySection;
