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

const CoApplicantSection = () => {
  const form = Form.useFormInstance();
  const hasCoApplicant = Form.useWatch("hasCoApplicant", form);
  const occupation = Form.useWatch("co_occupation", form);

  if (!hasCoApplicant) return null;

  const isSalaried = occupation === "Salaried";
  const isSelfEmployed = occupation === "Self Employed";
  const isProfessional = occupation === "Self Employed Professional";

  const handleSelect = (value, option) => {
    const c = option.customer;

    form.setFieldsValue({
      // PERSONAL
      co_name: c.customerName || "",
      co_motherName: c.motherName || "",
      co_fatherName: c.sdwOf || "",
      co_dob: c.dob ? dayjs(c.dob) : null,
      co_gender: c.gender || "",
      co_maritalStatus: c.maritalStatus || "",
      co_dependents: c.dependents || "",
      co_education: c.education || "",
      co_address: c.residenceAddress || "",
      co_pincode: c.pincode || "",
      co_city: c.city || "",
      co_yearsResidence: c.yearsInCurrentHouse || "",
      co_mobile: c.primaryMobile || "",
      co_house: c.houseType || "",
      co_pan: c.panNumber || "",
      co_aadhaar: c.aadhaarNumber || "",

      // OCCUPATIONAL
      co_occupation: c.occupationType || "",
      co_professionalType: c.professionalType || "",
      co_companyType: c.companyType || "",
      co_businessNature: c.businessNature || [],
      co_designation: c.designation || "",
      co_currentExp: c.experienceCurrent || "",
      co_totalExp: c.totalExperience || "",
      co_companyName: c.companyName || "",
      co_companyAddress: c.employmentAddress || "",
      co_companyPincode: c.employmentPincode || "",
      co_companyCity: c.employmentCity || "",
      co_companyPhone: c.employmentPhone || "",
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
          <TeamOutlined /> Co-Applicant Details
        </>
      }
    >
      {/* SEARCH */}
      <Form.Item label="Search Co-Applicant">
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
          <Form.Item label="Name" name="co_name">
            <Input />
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Mother's Name" name="co_motherName">
            <Input />
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Father / Husband Name" name="co_fatherName">
            <Input />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="DOB" name="co_dob">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Gender" name="co_gender">
            <Select>
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Marital Status" name="co_maritalStatus">
            <Select>
              <Option value="Married">Married</Option>
              <Option value="Unmarried">Unmarried</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Dependents" name="co_dependents">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col md={8}>
          <Form.Item label="Education" name="co_education">
            <Select>
              <Option value="Graduate">Graduate</Option>
              <Option value="Post Graduate">Post Graduate</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="House" name="co_house">
            <Select>
              <Option value="Owned">Owned</Option>
              <Option value="Rented">Rented</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col md={8}>
          <Form.Item label="Mobile" name="co_mobile">
            <Input />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Address" name="co_address">
            <TextArea rows={2} />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Pincode" name="co_pincode">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="City" name="co_city">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="PAN" name="co_pan">
            <Input />
          </Form.Item>
        </Col>
        <Col md={6}>
          <Form.Item label="Aadhaar" name="co_aadhaar">
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
          <Form.Item label="Occupation" name="co_occupation">
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

        {/* Professional Type */}
        {isProfessional && (
          <Col md={8}>
            <Form.Item label="Professional Type" name="co_professionalType">
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

        {/* Company Type */}
        {(isSalaried || isSelfEmployed || isProfessional) && (
          <Col md={8}>
            <Form.Item label="Type of Company" name="co_companyType">
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
        )}

        {/* Nature of Business */}
        {(isSalaried || isSelfEmployed || isProfessional) && (
          <Col md={8}>
            <Form.Item label="Nature of Business" name="co_businessNature">
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
        )}
      </Row>

      {/* EMPLOYER / BUSINESS DETAIL HEADER */}
      {(isSalaried || isSelfEmployed || isProfessional) && (
        <>
          <Divider orientation="left">Employer / Business Details</Divider>

          <Row gutter={16}>
            <Col md={8}>
              <Form.Item label="Designation" name="co_designation">
                <Input />
              </Form.Item>
            </Col>
            <Col md={8}>
              <Form.Item
                label="Experience in Current Job / Business"
                name="co_currentExp"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col md={8}>
              <Form.Item label="Total Experience" name="co_totalExp">
                <Input />
              </Form.Item>
            </Col>

            <Col md={8}>
              <Form.Item label="Company Name" name="co_companyName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Company Address" name="co_companyAddress">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="Pin Code" name="co_companyPincode">
                <Input />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="City" name="co_companyCity">
                <Input />
              </Form.Item>
            </Col>
            <Col md={6}>
              <Form.Item label="Phone No" name="co_companyPhone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

export default CoApplicantSection;
