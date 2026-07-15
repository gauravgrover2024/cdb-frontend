import React, { useEffect, useState, useRef } from "react";
import {
  DeleteOutlined,
  PhoneOutlined,
  PlusCircleOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";
import { BUSINESS_NATURE_OPTIONS, COMPANY_TYPE_OPTIONS, getOptionsWithCustom, isFirmConstitution } from "../../../../../constants/employmentOptions";
import CustomerQuickSearch from "../../../../shared/CustomerQuickSearch";
import { mapCustomerToPersonFields } from "./mapCustomerToPersonFields";
import { customersApi } from "../../../../../api/customers";
import { lookupCityByPincode, normalizePincode } from "./pincodeCityLookup";

const RELATION_WITH_FIRM_OPTIONS = ["Partner", "Shareholder", "Director", "Other"];
// Relations that represent a seat on the Partners/Directors register - a
// co-applicant with one of these gets auto-mirrored into companyPartners so
// the same details don't need to be re-entered there.
const PARTNERS_REGISTER_RELATIONS = ["Partner", "Director"];

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
  const hasCoApplicant = Form.useWatch("hasCoApplicant", form);
  const coId = Form.useWatch("co_id", form);
  const occupation = Form.useWatch("co_occupation", form);
  const coCompanyType = Form.useWatch("co_companyType", form);
  const coBusinessNature = Form.useWatch("co_businessNature", form);
  const coPincode = Form.useWatch("co_pincode", form);
  const [fetchingCoPincode, setFetchingCoPincode] = useState(false);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, coCompanyType);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, coBusinessNature);

  // Firm applicants (partnership/proprietorship) can have more than one
  // co-applicant, and each one's relation to the firm auto-fills the
  // Partners/Directors (companyPartners) list further down the form.
  const applicantType = Form.useWatch("applicantType", form);
  const companyType = Form.useWatch("companyType", form);
  const isFirm = applicantType === "Company" && isFirmConstitution(companyType);
  const coRelationWithFirm = Form.useWatch("co_relationWithFirm", form);
  const coCustomerName = Form.useWatch("co_customerName", form);
  const coPan = Form.useWatch("co_pan", form);
  const coDob = Form.useWatch("co_dob", form);
  const additionalCoApplicants = Form.useWatch("coApplicants", form);
  const autoPartnerKeysRef = useRef(new Set());

  // Auto-mirror any co-applicant marked as Partner/Director into the
  // Partners/Directors (companyPartners) list, so the same person's details
  // don't have to be typed twice. Only touches entries this effect itself
  // added on a previous run (tracked by name+PAN key) - manually-added
  // partner rows are left alone.
  useEffect(() => {
    if (!isFirm || !hasCoApplicant) return;

    const toKey = (name, pan) =>
      `${String(name || "").trim().toLowerCase()}|${String(pan || "").trim().toUpperCase()}`;

    const candidates = [
      {
        name: coCustomerName,
        relation: coRelationWithFirm,
        pan: coPan,
        contactNumber: form.getFieldValue("co_primaryMobile"),
        dateOfBirth: coDob ? (dayjs.isDayjs(coDob) ? coDob.format("YYYY-MM-DD") : String(coDob)) : "",
      },
      ...(Array.isArray(additionalCoApplicants) ? additionalCoApplicants : []).map((c) => ({
        name: c?.customerName,
        relation: c?.relationWithFirm,
        pan: c?.pan,
        contactNumber: c?.primaryMobile,
        dateOfBirth: c?.dob ? (dayjs.isDayjs(c.dob) ? c.dob.format("YYYY-MM-DD") : String(c.dob)) : "",
      })),
    ];

    const desired = candidates
      .filter((c) => PARTNERS_REGISTER_RELATIONS.includes(c.relation) && String(c.name || "").trim())
      .map((c) => ({
        name: c.name,
        panNumber: c.pan || "",
        contactNumber: c.contactNumber || "",
        dateOfBirth: c.dateOfBirth || "",
        __key: toKey(c.name, c.pan),
      }));
    const desiredKeys = new Set(desired.map((d) => d.__key));

    const existing = Array.isArray(form.getFieldValue("companyPartners"))
      ? form.getFieldValue("companyPartners")
      : [];

    // Keep rows the user added manually (never auto-managed), plus rows this
    // effect previously added that are still desired (refreshed with latest
    // details). Drop rows this effect previously added but are no longer
    // desired (relation changed away from Partner/Director, or removed).
    const untouched = existing.filter(
      (row) => !autoPartnerKeysRef.current.has(toKey(row?.name, row?.panNumber)),
    );

    const nextPartners = [
      ...untouched,
      ...desired.map(({ __key, ...row }) => row),
    ];

    const isSame =
      existing.length === nextPartners.length &&
      existing.every((row, i) => {
        const next = nextPartners[i];
        return (
          row?.name === next?.name &&
          row?.panNumber === next?.panNumber &&
          row?.contactNumber === next?.contactNumber &&
          row?.dateOfBirth === next?.dateOfBirth
        );
      });

    if (!isSame) {
      form.setFieldsValue({ companyPartners: nextPartners });
    }
    autoPartnerKeysRef.current = desiredKeys;
  }, [
    isFirm,
    hasCoApplicant,
    coCustomerName,
    coRelationWithFirm,
    coPan,
    coDob,
    additionalCoApplicants,
    form,
  ]);

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
    if (typeof coBusinessNature === "string" && coBusinessNature.trim()) {
      form.setFieldsValue({ co_businessNature: [coBusinessNature.trim()] });
    }
  }, [coBusinessNature, form]);

  if (!hasCoApplicant) return null;

  const normalizedOccupation = normalizeOccupationForUI(occupation);
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

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} md={8}>
          <Form.Item label="Total Income" name="co_totalIncome">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="Enter Total Income"
              className={fieldClass}
              formatter={(value) => {
                if (!value) return "";
                const numValue = Number(value);
                return `₹ ${numValue.toLocaleString("en-IN")}`;
              }}
              parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
      </Row>

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
        {isFirm && (
          <Col xs={24} md={8}>
            <Form.Item
              label="Relation with Firm"
              name="co_relationWithFirm"
              tooltip="Partner/Director selections auto-fill this person into the Partners/Directors list below."
            >
              <Select
                className={fieldClass}
                placeholder="Select relation"
                allowClear
              >
                {RELATION_WITH_FIRM_OPTIONS.map((option) => (
                  <Option key={option} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        )}
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

        {/* Professional Type */}
        {isProfessional && (
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
        {(isSalaried || isSelfEmployed || isProfessional) && (
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
        {(isSalaried || isSelfEmployed || isProfessional) && (
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

      {/* ================= ADDITIONAL CO-APPLICANTS (FIRM ONLY) ================= */}
      {isFirm && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <TeamOutlined className="text-[12px] text-muted-foreground" />
            <span className={sectionLabelClass}>Additional Co-Applicants</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Firm applicants can add more than one co-applicant (e.g. multiple partners co-signing).
            Set a relation of Partner or Director to auto-fill that person into Partners/Directors
            Details below.
          </p>

          <Form.List name="coApplicants">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="md:col-span-3">
                      <Form.Item
                        {...field}
                        label="Name"
                        name={[field.name, "customerName"]}
                        className="mb-0"
                      >
                        <Input placeholder="Co-applicant name" />
                      </Form.Item>
                    </div>
                    <div className="md:col-span-2">
                      <Form.Item
                        {...field}
                        label="Relation with Firm"
                        name={[field.name, "relationWithFirm"]}
                        className="mb-0"
                      >
                        <Select placeholder="Select" allowClear>
                          {RELATION_WITH_FIRM_OPTIONS.map((option) => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="md:col-span-2">
                      <Form.Item
                        {...field}
                        label="Mobile"
                        name={[field.name, "primaryMobile"]}
                        className="mb-0"
                        rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits required" }]}
                      >
                        <Input maxLength={10} placeholder="10-digit number" />
                      </Form.Item>
                    </div>
                    <div className="md:col-span-2">
                      <Form.Item
                        {...field}
                        label="PAN"
                        name={[field.name, "pan"]}
                        className="mb-0"
                      >
                        <Input placeholder="ABCDE1234F" />
                      </Form.Item>
                    </div>
                    <div className="md:col-span-2">
                      <Form.Item
                        {...field}
                        label="Aadhaar"
                        name={[field.name, "aadhaar"]}
                        className="mb-0"
                      >
                        <Input placeholder="1234 5678 9012" />
                      </Form.Item>
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusCircleOutlined />}
                  onClick={() =>
                    add({
                      customerName: "",
                      relationWithFirm: undefined,
                      primaryMobile: "",
                      pan: "",
                      aadhaar: "",
                    })
                  }
                >
                  Add Co-Applicant
                </Button>
              </div>
            )}
          </Form.List>
        </div>
      )}
    </div>
  );
};

export default CoApplicantSection;
