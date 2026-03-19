import React, { useEffect, useState } from "react";
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
import dayjs from "dayjs";
import { BUSINESS_NATURE_OPTIONS, COMPANY_TYPE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";
import { customersApi } from "../../../../../api/customers";
import { lookupCityByPincode, normalizePincode } from "./pincodeCityLookup";

const { Option } = Select;
const normalizeMultiTags = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
const normalizeOccupationForUI = (value) => {
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!text) return "";
  if (text.includes("salaried")) return "Salaried";
  if (text.includes("professional")) return "Self Employed Professional";
  if (text.includes("self employed") || text.includes("selfemployed")) return "Self Employed";
  return value;
};
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

const CoApplicantSection = () => {
  const form = Form.useFormInstance();
  const applicantType = Form.useWatch("applicantType", form);
  const hasCoApplicant = Form.useWatch("hasCoApplicant", form);
  const coId = Form.useWatch("co_id", form);
  const occupation = Form.useWatch("co_occupation", form);
  const coCompanyType = Form.useWatch("co_companyType", form);
  const coBusinessNature = Form.useWatch("co_businessNature", form);
  const coPincode = Form.useWatch("co_pincode", form);
  const coCompanyPincode = Form.useWatch("co_companyPincode", form);
  const [fetchingCoPincode, setFetchingCoPincode] = useState(false);
  const [fetchingCoCompanyPincode, setFetchingCoCompanyPincode] = useState(false);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, coCompanyType);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, coBusinessNature);

  const handleCustomerSelect = (customer) => {
    const mappedFields = mapCustomerToPersonFields(customer, "co");
    form.setFieldsValue(mappedFields);
  };

  useEffect(() => {
    const fillLinkedCustomer = async () => {
      if (!hasCoApplicant || !coId) return;
      const currentExp = form.getFieldValue("co_currentExperience");
      const totalExp = form.getFieldValue("co_totalExperience");
      if (currentExp !== undefined && currentExp !== null && currentExp !== "") {
        return;
      }

      try {
        const res = await customersApi.getById(coId);
        const customer = res?.data;
        if (!customer) return;
        const patch = {};
        const customerCurrent = customer.experienceCurrent ?? customer.currentExp;
        const customerTotal = customer.totalExperience ?? customer.totalExp;
        if ((currentExp === undefined || currentExp === null || currentExp === "") && customerCurrent !== undefined && customerCurrent !== null && customerCurrent !== "") {
          patch.co_currentExperience = customerCurrent;
        }
        if ((totalExp === undefined || totalExp === null || totalExp === "") && customerTotal !== undefined && customerTotal !== null && customerTotal !== "") {
          patch.co_totalExperience = customerTotal;
        }
        if ((form.getFieldValue("co_pan") === undefined || form.getFieldValue("co_pan") === null) && customer.panNumber) {
          patch.co_pan = customer.panNumber;
        }
        if (Object.keys(patch).length) {
          form.setFieldsValue(patch);
        }
      } catch (error) {
        console.error("Failed to hydrate linked co-applicant customer", error);
      }
    };

    fillLinkedCustomer();
  }, [hasCoApplicant, coId, form]);

  useEffect(() => {
    const pin = normalizePincode(coPincode);
    if (!pin) return;
    let cancelled = false;

    const fetchCity = async () => {
      try {
        setFetchingCoPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ co_city: city });
        }
      } catch (error) {
        console.error("Co-applicant pincode fetch failed", error);
      } finally {
        if (!cancelled) setFetchingCoPincode(false);
      }
    };

    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coPincode, form]);

  useEffect(() => {
    const pin = normalizePincode(coCompanyPincode);
    if (!pin) return;
    let cancelled = false;

    const fetchCity = async () => {
      try {
        setFetchingCoCompanyPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ co_companyCity: city });
        }
      } catch (error) {
        console.error("Co-applicant company pincode fetch failed", error);
      } finally {
        if (!cancelled) setFetchingCoCompanyPincode(false);
      }
    };

    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coCompanyPincode, form]);

  useEffect(() => {
    if (typeof coBusinessNature === "string" && coBusinessNature.trim()) {
      form.setFieldsValue({ co_businessNature: [coBusinessNature.trim()] });
    }
  }, [coBusinessNature, form]);

  if (!hasCoApplicant) return null;

  const normalizedOccupation = normalizeOccupationForUI(occupation);
  const isCompanyApplicant = applicantType === "Company";
  const isSalaried = normalizedOccupation === "Salaried";
  const isSelfEmployed = normalizedOccupation === "Self Employed";
  const isProfessional = normalizedOccupation === "Self Employed Professional";
  const sectionLabelClass =
    "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground";
  const fieldClass = "h-10 rounded-lg w-full";

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="section-header mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <TeamOutlined className="text-[18px] text-foreground" />
        </div>
        <span className="text-base text-foreground">Co-Applicant Details</span>
      </div>

      {/* ================= PERSONAL DETAILS ================= */}
      <div className="mb-4 mt-6 flex items-center gap-2">
        <SolutionOutlined className="text-[12px] text-muted-foreground" />
        <span className={sectionLabelClass}>Personal Details</span>
      </div>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Name" name="co_customerName">
            <CustomerQuickSearch
              onSelect={handleCustomerSelect}
              placeholder="Search or Enter Name"
              className={fieldClass}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="co_motherName">
            <Input className={fieldClass} placeholder="Name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Father / Husband Name" name="co_fatherName">
            <Input className={fieldClass} placeholder="Name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="DOB" name="co_dob">
            <DatePicker style={{ width: "100%" }} className={fieldClass} getValueProps={(value) => ({ value: asDayjs(value) })} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="co_gender">
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
          <Form.Item label="Marital Status" name="co_maritalStatus">
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
          <Form.Item label="Dependents" name="co_dependents">
            <InputNumber className={fieldClass} style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Education" name="co_education">
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
          <Form.Item label="House" name="co_houseType">
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
            name="co_primaryMobile"
            rules={[{ pattern: /^[0-9]{10}$/, message: '10 digits required' }]}
          >
            <Input maxLength={10} className={fieldClass} prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="10-digit number" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item label="Address" name="co_address">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="House no, Street, Area" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="co_pincode">
            <Input className={fieldClass} maxLength={6} placeholder="6-digit PIN" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="City" name="co_city">
            <Input
              className={fieldClass}
              suffix={
                fetchingCoPincode ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Fetching...
                  </span>
                ) : null
              }
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="PAN" name="co_pan">
            <Input className={fieldClass} placeholder="ABCDE1234F" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar" name="co_aadhaar">
            <Input className={fieldClass} placeholder="1234 5678 9012" />
          </Form.Item>
        </Col>
        {isCompanyApplicant && (
          <Col xs={24} md={8}>
            <Form.Item
              label="Years at current Residence"
              name="co_yearsAtCurrentResidence"
            >
              <Input className={fieldClass} placeholder="Years" />
            </Form.Item>
          </Col>
        )}
      </Row>

      {/* ================= OCCUPATIONAL DETAILS ================= */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <SolutionOutlined className="text-[12px] text-muted-foreground" />
        <span className={sectionLabelClass}>Occupational Details</span>
      </div>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="Occupation" name="co_occupation">
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

        {isCompanyApplicant && (
          <>
            <Col xs={24} md={8}>
              <Form.Item label="Designation" name="co_designation">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Current Exp (Years)"
                name="co_currentExperience"
              >
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Total Exp (Years)" name="co_totalExperience">
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>
          </>
        )}

        {/* Professional Type */}
        {!isCompanyApplicant && isProfessional && (
          <Col xs={24} md={8}>
            <Form.Item label="Professional Type" name="co_professionalType">
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
        {!isCompanyApplicant && (isSalaried || isSelfEmployed || isProfessional) && (
          <Col xs={24} md={8}>
            <Form.Item label="Type of Company" name="co_companyType">
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
        {!isCompanyApplicant && (isSalaried || isSelfEmployed || isProfessional) && (
          <Col xs={24} md={8}>
            <Form.Item label="Nature of Business" name="co_businessNature">
              <Select
                mode="tags"
                className="w-full"
                placeholder="Select or type multiple business types"
                allowClear
                showSearch
                optionFilterProp="label"
                options={businessNatureOptions}
                tokenSeparators={[","]}
                onChange={(value) =>
                  form.setFieldsValue({ co_businessNature: normalizeMultiTags(value) })
                }
              />
            </Form.Item>
          </Col>
        )}
      </Row>

      {/* EMPLOYER / BUSINESS DETAIL HEADER */}
      {!isCompanyApplicant && (isSalaried || isSelfEmployed || isProfessional) && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8 opacity-80">
            <SolutionOutlined className="text-[12px] text-muted-foreground" />
            <span className={sectionLabelClass}>Employer / Business Details</span>
          </div>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label="Designation" name="co_designation">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Current Exp (Years)"
                name="co_currentExperience"
              >
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Total Exp (Years)" name="co_totalExperience">
                <Input className={fieldClass} placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Company Name" name="co_companyName">
                <Input className={fieldClass} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Company Address" name="co_companyAddress">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Full Business Address" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Pin Code" name="co_companyPincode">
                <Input className={fieldClass} maxLength={6} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="City" name="co_companyCity">
                <Input
                  className={fieldClass}
                  suffix={
                    fetchingCoCompanyPincode ? (
                      <span className="text-[10px] text-muted-foreground animate-pulse">
                        Fetching...
                      </span>
                    ) : null
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Phone No" name="co_companyPhone">
                <Input className={fieldClass} prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default CoApplicantSection;
