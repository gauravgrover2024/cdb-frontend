import React from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Card,
  AutoComplete,
  Divider,
} from "antd";
import { TeamOutlined, SolutionOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import demoCustomers from "../../../../customers/demoCustomers";

const { Option } = Select;
const { TextArea } = Input;

const GuarantorSection = () => {
  const form = Form.useFormInstance();
  const hasGuarantor = Form.useWatch("hasGuarantor", form);
  const occupation = Form.useWatch("gu_occupation", form);

  if (!hasGuarantor) return null;

  const isSalaried = occupation === "Salaried";
  const isSelfEmployed = occupation === "Self Employed";
  const isProfessional = occupation === "Self Employed Professional";

  const handleSelect = (value, option) => {
    const c = option.customer;

    form.setFieldsValue({
      // PERSONAL
      gu_name: c.customerName ?? "",
      gu_motherName: c.motherName ?? "",
      gu_fatherName: c.sdwOf ?? "",
      gu_dob: c.dob ? dayjs(c.dob) : null,
      gu_gender: c.gender ?? "",
      gu_maritalStatus: c.maritalStatus ?? "",
      gu_dependents:
        c.dependents !== undefined && c.dependents !== null
          ? Number(c.dependents)
          : null,
      gu_education: c.education ?? c.educationDetails ?? "",
      gu_address: c.residenceAddress ?? "",
      gu_pincode: c.pincode ?? "",
      gu_city: c.city ?? "",
      gu_yearsResidence: c.yearsInCurrentHouse ?? "",
      gu_mobile: c.primaryMobile ?? "",
      gu_house: c.houseType ?? "",
      gu_pan: c.panNumber ?? "",
      gu_aadhaar: c.aadhaarNumber ?? "",

      // OCCUPATIONAL
      gu_occupation: c.occupationType ?? "",
      gu_professionalType: c.professionalType ?? "",
      gu_companyType: c.companyType ?? "",
      gu_businessNature: c.businessNature ?? [],
      gu_designation: c.designation ?? "",
      gu_currentExp: c.experienceCurrent ?? "",
      gu_totalExp: c.totalExperience ?? "",
      gu_companyName: c.companyName ?? "",
      gu_companyAddress: c.employmentAddress ?? "",
      gu_companyPincode: c.employmentPincode ?? "",
      gu_companyCity: c.employmentCity ?? "",
      gu_companyPhone: c.employmentPhone ?? "",
    });
  };

  const options = demoCustomers.map((c) => ({
    value: `${c.customerName} - ${c.primaryMobile}`,
    label: `${c.customerName} (${c.primaryMobile})`,
    customer: c,
  }));

  return (
    <Card
      style={{ borderRadius: 12 }}
      title={
        <>
          <TeamOutlined /> Guarantor Details
        </>
      }
    >
      {/* SEARCH */}
      <Form.Item label="Search Guarantor">
        <AutoComplete
          options={options}
          onSelect={handleSelect}
          placeholder="Search by name or mobile"
        />
      </Form.Item>

      {/* ================= PERSONAL DETAILS ================= */}
      <Divider orientation="left">Personal Details</Divider>

      <Row gutter={16}>
        <Col md={8}>
          <Form.Item label="Name" name="gu_name">
            <Input />
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Mother's Name" name="gu_motherName">
            <Input />
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Father / Husband Name" name="gu_fatherName">
            <Input />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="DOB" name="gu_dob">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Gender" name="gu_gender">
            <Select>
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Marital Status" name="gu_maritalStatus">
            <Select>
              <Option value="Married">Married</Option>
              <Option value="Unmarried">Unmarried</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Dependents" name="gu_dependents">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col md={8}>
          <Form.Item label="Education" name="gu_education">
            <Select>
              <Option value="Graduate">Graduate</Option>
              <Option value="Post Graduate">Post Graduate</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="House" name="gu_house">
            <Select>
              <Option value="Owned">Owned</Option>
              <Option value="Rented">Rented</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Mobile" name="gu_mobile">
            <Input />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Address" name="gu_address">
            <TextArea rows={2} />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Pincode" name="gu_pincode">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="City" name="gu_city">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="PAN" name="gu_pan">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Aadhaar" name="gu_aadhaar">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* ================= OCCUPATIONAL DETAILS ================= */}
      <Divider orientation="left">
        <SolutionOutlined /> Occupational Details
      </Divider>

      <Row gutter={16}>
        <Col md={8}>
          <Form.Item label="Occupation" name="gu_occupation">
            <Select>
              <Option value="Salaried">Salaried</Option>
              <Option value="Self Employed">Self Employed</Option>
              <Option value="Self Employed Professional">
                Self Employed Professional
              </Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
        </Col>

        {isProfessional && (
          <Col md={8}>
            <Form.Item label="Professional Type" name="gu_professionalType">
              <Select>
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

        {(isSalaried || isSelfEmployed || isProfessional) && (
          <>
            <Col md={8}>
              <Form.Item label="Type of Company" name="gu_companyType">
                <Select showSearch>
                  <Option value="Pvt Ltd">Pvt Ltd</Option>
                  <Option value="Partnership">Partnership</Option>
                  <Option value="Proprietorship">Proprietorship</Option>
                  <Option value="Public Ltd">Public Ltd</Option>
                  <Option value="PSU">PSU</Option>
                  <Option value="Govt">Govt</Option>
                  <Option value="MNC">MNC</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col md={8}>
              <Form.Item label="Nature of Business" name="gu_businessNature">
                <Select mode="multiple" showSearch>
                  <Option value="Automobiles">Automobiles</Option>
                  <Option value="Banking">Banking</Option>
                  <Option value="IT">IT</Option>
                  <Option value="Retail">Retail</Option>
                  <Option value="Real Estate">Real Estate</Option>
                  <Option value="NBFC">NBFC</Option>
                  <Option value="FMCG">FMCG</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </>
        )}
      </Row>

      {(isSalaried || isSelfEmployed || isProfessional) && (
        <>
          <Divider orientation="left">Employer / Business Details</Divider>

          <Row gutter={16}>
            <Col md={8}>
              <Form.Item label="Designation" name="gu_designation">
                <Input />
              </Form.Item>
            </Col>
            <Col md={8}>
              <Form.Item
                label="Experience in Current Job / Business"
                name="gu_currentExp"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col md={8}>
              <Form.Item label="Total Experience" name="gu_totalExp">
                <Input />
              </Form.Item>
            </Col>

            <Col md={8}>
              <Form.Item label="Company Name" name="gu_companyName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Company Address" name="gu_companyAddress">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="Pin Code" name="gu_companyPincode">
                <Input />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="City" name="gu_companyCity">
                <Input />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="Phone No" name="gu_companyPhone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

export default GuarantorSection;
