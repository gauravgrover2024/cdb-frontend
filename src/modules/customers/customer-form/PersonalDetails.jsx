import React, { useEffect, useState, useRef, useCallback } from "react";
import { Form, Input, DatePicker, Select, Row, Col, Tag, Spin, Switch, Radio, InputNumber } from "antd";
import Icon from "../../../components/AppIcon";
import { customersApi } from "../../../api/customers";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;
const ADDRESS_TYPE_OPTIONS = [
  { label: "Owned", value: "Owned" },
  { label: "Parental", value: "Parental" },
  { label: "Rented", value: "Rented" },
  { label: "Company Provided", value: "Company Provided" },
];
const IDENTITY_OPTIONS = [
  { label: "PAN", value: "PAN" },
  { label: "AADHAAR", value: "AADHAAR" },
  { label: "PASSPORT", value: "PASSPORT" },
  { label: "DRIVING LICENSE", value: "DRIVING_LICENSE" },
  { label: "VOTER ID", value: "VOTER_ID" },
];
const ADDRESS_PROOF_OPTIONS = [
  { label: "Aadhaar", value: "AADHAAR" },
  { label: "Passport", value: "PASSPORT" },
  { label: "Driving License", value: "DRIVING_LICENSE" },
  { label: "Voter ID", value: "VOTER_ID" },
  { label: "Utility Bill", value: "UTILITY_BILL" },
  { label: "Rent Agreement", value: "RENT_AGREEMENT" },
];

const toDayjsSafe = (val) => {
  if (!val) return undefined;
  if (dayjs.isDayjs(val)) return val;
  if (typeof val === "object") {
    const mongoDate = val?.$date || val?.date || val?.value;
    if (mongoDate) {
      const md = dayjs(mongoDate);
      if (md.isValid()) return md;
    }
  }
  const d = dayjs(val);
  return d.isValid() ? d : undefined;
};

const PersonalDetails = ({
  excludeFields = false,
  searchable = false,
  prefillMode = "all",
  showApplicantType = true,
  cashMinimalMode = false,
}) => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const applicantType = Form.useWatch("applicantType", form);
  const aadhaarNumberValue = Form.useWatch("aadhaarNumber", form);
  const aadharNumberValue = Form.useWatch("aadharNumber", form);
  
  // Watch fields for logic
  const pincode = Form.useWatch("pincode", form);
  const permanentPincode = Form.useWatch("permanentPincode", form);
  const education = Form.useWatch("education", form);
  const sameAsCurrentAddress = Form.useWatch("sameAsCurrentAddress", form);
  const registerSameAsAadhaar = Form.useWatch("registerSameAsAadhaar", form);
  const registerSameAsPermanent = Form.useWatch("registerSameAsPermanent", form);
  const employmentAddress = Form.useWatch("employmentAddress", form);
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const employmentCity = Form.useWatch("employmentCity", form);
  const employmentPhone = Form.useWatch("employmentPhone", form);
  const officialEmail = Form.useWatch("officialEmail", form);
  const contactPersonMobile = Form.useWatch("contactPersonMobile", form);
  const registrationPincode = Form.useWatch("registrationPincode", form);
  const identityProofType = Form.useWatch("identityProofType", form);
  const isCompany = applicantType === "Company";

  useEffect(() => {
    if (!aadhaarNumberValue && aadharNumberValue) {
      form.setFieldValue("aadhaarNumber", aadharNumberValue);
      return;
    }
    if (!aadharNumberValue && aadhaarNumberValue) {
      form.setFieldValue("aadharNumber", aadhaarNumberValue);
    }
  }, [aadhaarNumberValue, aadharNumberValue, form]);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 1. Pincode to City logic (Real API)
  const [fetchingPincode, setFetchingPincode] = useState(false);

  useEffect(() => {
    if (pincode && pincode.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingPincode(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await response.json();

          if (data && data[0]?.Status === "Success") {
             const postOffices = data[0].PostOffice;
             if (postOffices && postOffices.length > 0) {
                const city = postOffices[0].District; 
                form.setFieldsValue({ city: city });
             }
          }
        } catch (error) {
           console.error("Pincode fetch failed", error);
        } finally {
           setFetchingPincode(false);
        }
      };

      const timer = setTimeout(fetchCity, 500); 
      return () => clearTimeout(timer);
    }
  }, [pincode, form]);

  useEffect(() => {
    if (permanentPincode && permanentPincode.length === 6) {
      const fetchCity = async () => {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${permanentPincode}`);
          const data = await response.json();

          if (data && data[0]?.Status === "Success") {
            const postOffices = data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              form.setFieldsValue({ permanentCity: postOffices[0].District });
            }
          }
        } catch (error) {
          console.error("Permanent pincode fetch failed", error);
        }
      };

      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [permanentPincode, form]);

  useEffect(() => {
    if (registrationPincode && registrationPincode.length === 6) {
      const fetchCity = async () => {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${registrationPincode}`);
          const data = await response.json();

          if (data && data[0]?.Status === "Success") {
            const postOffices = data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              form.setFieldsValue({ registrationCity: postOffices[0].District });
            }
          }
        } catch (error) {
          console.error("Registration pincode fetch failed", error);
        }
      };

      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [registrationPincode, form]);

  useEffect(() => {
    if (!isCompany) return;

    const current = form.getFieldsValue([
      "residenceAddress",
      "pincode",
      "city",
      "primaryMobile",
      "email",
    ]);

    form.setFieldsValue({
      residenceAddress: current.residenceAddress || employmentAddress || "",
      pincode: current.pincode || employmentPincode || "",
      city: current.city || employmentCity || "",
      primaryMobile: current.primaryMobile || employmentPhone || contactPersonMobile || "",
      email: current.email || officialEmail || "",
    });
  }, [
    isCompany,
    form,
    employmentAddress,
    employmentPincode,
    employmentCity,
    employmentPhone,
    contactPersonMobile,
    officialEmail,
  ]);

  useEffect(() => {
    if (!(cashMinimalMode && isCompany)) return;

    if (registerSameAsAadhaar === "Yes") {
      form.setFieldsValue({
        registerSameAsPermanent: undefined,
        registrationAddress: form.getFieldValue("residenceAddress") || "",
        registrationPincode: form.getFieldValue("pincode") || "",
        registrationCity: form.getFieldValue("registrationCity") || form.getFieldValue("city") || "",
      });
      return;
    }

    if (registerSameAsAadhaar === "No" && registerSameAsPermanent === "Yes") {
      form.setFieldsValue({
        registrationAddress: form.getFieldValue("permanentAddress") || "",
        registrationPincode: form.getFieldValue("permanentPincode") || "",
        registrationCity:
          form.getFieldValue("registrationCity") || form.getFieldValue("permanentCity") || "",
      });
    }
  }, [cashMinimalMode, isCompany, registerSameAsAadhaar, registerSameAsPermanent, form]);

  /* Customer Search Logic with race condition handling */
  const fetchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setFilteredCustomers([]);
      setLoading(false);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    
    try {
      const res = await customersApi.search(q);
      // Only update if this is still the latest request
      if (!abortControllerRef.current.signal.aborted) {
        const list = Array.isArray(res?.data) ? res.data : [];
        setFilteredCustomers(list);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Search error:", e);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm) {
      setFilteredCustomers([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchCustomers(searchTerm), 350);
    return () => {
      clearTimeout(debounceRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, fetchCustomers]);

  const handleCustomerSelect = useCallback(async (customer) => {
    try {
      setLoadingFullData(true);
      
      // Fetch full customer details to ensure we have all data
      const customerId = customer?._id || customer?.id;
      const fullCustomerRes = customerId ? await customersApi.getById(customerId) : null;
      const fullCustomer = fullCustomerRes?.data || customer;
      const pick = (...values) => values.find((val) => val !== undefined && val !== null && val !== "");
      const normalizeCompanyType = (value) =>
        Array.isArray(value) ? value[0] || "" : (value || "");
      const normalizeBusinessNature = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
        return [];
      };
      const normalizedReference = (ref, prefix) => {
        const obj = ref && typeof ref === "object" ? ref : {};
        const out = {
          name: pick(obj.name, fullCustomer?.[`${prefix}_name`], ""),
          mobile: pick(obj.mobile, fullCustomer?.[`${prefix}_mobile`], ""),
          address: pick(obj.address, fullCustomer?.[`${prefix}_address`], ""),
          pincode: pick(obj.pincode, fullCustomer?.[`${prefix}_pincode`], ""),
          city: pick(obj.city, fullCustomer?.[`${prefix}_city`], ""),
          relation: pick(obj.relation, fullCustomer?.[`${prefix}_relation`], ""),
        };
        return Object.values(out).some(Boolean) ? out : undefined;
      };
      
      const baseValues = {
        customerId: pick(fullCustomer._id, fullCustomer.id, ""),
        customerName: fullCustomer.customerName || "",
        primaryMobile: fullCustomer.primaryMobile || "",
      };

      const reference1 = normalizedReference(fullCustomer.reference1, "reference1");
      const reference2 = normalizedReference(fullCustomer.reference2, "reference2");

      const fullValues = {
        ...baseValues,
        customerIdDisplay: pick(fullCustomer.customerId, fullCustomer.customerIdDisplay, ""),
        applicantType: pick(fullCustomer.applicantType, fullCustomer.customerType, ""),
        sdwOf: pick(fullCustomer.sdwOf, fullCustomer.fatherName, ""),
        fatherName: pick(fullCustomer.fatherName, fullCustomer.sdwOf, ""),
        gender: pick(fullCustomer.gender, ""),
        dob: toDayjsSafe(fullCustomer.dob),
        motherName: pick(fullCustomer.motherName, ""),
        residenceAddress: pick(fullCustomer.residenceAddress, fullCustomer.currentAddress, ""),
        pincode: pick(fullCustomer.pincode, ""),
        city: pick(fullCustomer.city, ""),
        yearsInCurrentHouse: pick(fullCustomer.yearsInCurrentHouse, ""),
        yearsInCurrentCity: pick(fullCustomer.yearsInCurrentCity, ""),
        houseType: pick(fullCustomer.houseType, ""),
        addressType: pick(fullCustomer.addressType, ""),
        education: pick(fullCustomer.education, ""),
        educationOther: pick(fullCustomer.educationOther, ""),
        maritalStatus: pick(fullCustomer.maritalStatus, ""),
        dependents: pick(fullCustomer.dependents, ""),
        extraMobiles: Array.isArray(fullCustomer.extraMobiles) ? fullCustomer.extraMobiles : [],
        email: pick(fullCustomer.email, fullCustomer.emailAddress, ""),
        whatsappNumber: pick(fullCustomer.whatsappNumber, ""),
        contactPersonName: pick(fullCustomer.contactPersonName, ""),
        contactPersonMobile: pick(fullCustomer.contactPersonMobile, ""),
        sameAsCurrentAddress: fullCustomer.sameAsCurrentAddress,
        permanentAddress: pick(fullCustomer.permanentAddress, ""),
        permanentPincode: pick(fullCustomer.permanentPincode, ""),
        permanentCity: pick(fullCustomer.permanentCity, ""),
        identityProofType: pick(fullCustomer.identityProofType, ""),
        identityProofNumber: pick(fullCustomer.identityProofNumber, ""),
        identityProofExpiry: toDayjsSafe(fullCustomer.identityProofExpiry),
        addressProofType: pick(fullCustomer.addressProofType, ""),
        addressProofNumber: pick(fullCustomer.addressProofNumber, ""),
        hasCoApplicant: pick(fullCustomer.hasCoApplicant, false),
        hasGuarantor: pick(fullCustomer.hasGuarantor, false),
        nomineeName: pick(fullCustomer.nomineeName, ""),
        nomineeDob: toDayjsSafe(fullCustomer.nomineeDob),
        nomineeRelation: pick(fullCustomer.nomineeRelation, ""),
        
        // Employment / business
        occupationType: pick(fullCustomer.occupationType, ""),
        employmentType: pick(fullCustomer.employmentType, ""),
        professionalType: pick(fullCustomer.professionalType, ""),
        companyName: pick(fullCustomer.companyName, ""),
        designation: pick(fullCustomer.designation, ""),
        companyPartners: Array.isArray(fullCustomer.companyPartners) ? fullCustomer.companyPartners : [],
        companyType: normalizeCompanyType(fullCustomer.companyType),
        businessNature: normalizeBusinessNature(fullCustomer.businessNature),
        experienceCurrent: pick(fullCustomer.experienceCurrent, fullCustomer.currentExp, ""),
        totalExperience: pick(fullCustomer.totalExperience, fullCustomer.totalExp, ""),
        currentExp: pick(fullCustomer.currentExp, fullCustomer.experienceCurrent, ""),
        totalExp: pick(fullCustomer.totalExp, fullCustomer.totalExperience, ""),
        incorporationYear: pick(fullCustomer.incorporationYear, ""),
        isMSME: pick(fullCustomer.isMSME, ""),
        employmentAddress: pick(fullCustomer.employmentAddress, fullCustomer.companyAddress, ""),
        employmentPincode: pick(fullCustomer.employmentPincode, fullCustomer.companyPincode, ""),
        employmentCity: pick(fullCustomer.employmentCity, fullCustomer.companyCity, ""),
        employmentPhone: pick(fullCustomer.employmentPhone, fullCustomer.companyPhone, ""),
        officialEmail: pick(fullCustomer.officialEmail, ""),
        registerSameAsAadhaar: pick(fullCustomer.registerSameAsAadhaar, ""),
        registerSameAsPermanent: pick(fullCustomer.registerSameAsPermanent, ""),
        registrationAddress: pick(fullCustomer.registrationAddress, ""),
        registrationPincode: pick(fullCustomer.registrationPincode, ""),
        registrationCity: pick(fullCustomer.registrationCity, ""),
        signatory_customerName: pick(fullCustomer.signatory_customerName, ""),
        signatory_primaryMobile: pick(fullCustomer.signatory_primaryMobile, ""),
        signatory_dob: toDayjsSafe(fullCustomer.signatory_dob),
        signatory_address: pick(fullCustomer.signatory_address, ""),
        signatory_pincode: pick(fullCustomer.signatory_pincode, ""),
        signatory_city: pick(fullCustomer.signatory_city, ""),
        signatory_designation: pick(fullCustomer.signatory_designation, ""),
        signatory_pan: pick(fullCustomer.signatory_pan, ""),
        signatory_aadhaar: pick(fullCustomer.signatory_aadhaar, ""),
        
        // Income
        monthlyIncome: pick(fullCustomer.monthlyIncome, ""),
        salaryMonthly: pick(fullCustomer.salaryMonthly, fullCustomer.monthlySalary, ""),
        monthlySalary: pick(fullCustomer.monthlySalary, fullCustomer.salaryMonthly, ""),
        annualIncome: pick(fullCustomer.annualIncome, ""),
        totalIncomeITR: pick(fullCustomer.totalIncomeITR, ""),
        
        // Banking
        bankName: pick(fullCustomer.bankName, ""),
        accountNumber: pick(fullCustomer.accountNumber, ""),
        ifsc: pick(fullCustomer.ifsc, fullCustomer.ifscCode, ""),
        ifscCode: pick(fullCustomer.ifscCode, fullCustomer.ifsc, ""),
        branch: pick(fullCustomer.branch, ""),
        accountType: pick(fullCustomer.accountType, ""),
        accountSinceYears: pick(fullCustomer.accountSinceYears, ""),
        openedIn: pick(fullCustomer.openedIn, ""),
        docsPreparedBy: pick(fullCustomer.docsPreparedBy, ""),
        
        // KYC
        panNumber: pick(fullCustomer.panNumber, ""),
        aadhaarNumber: pick(fullCustomer.aadhaarNumber, fullCustomer.aadharNumber, ""),
        aadharNumber: pick(fullCustomer.aadharNumber, fullCustomer.aadhaarNumber, ""),
        gstNumber: pick(fullCustomer.gstNumber, ""),
        passportNumber: pick(fullCustomer.passportNumber, ""),
        dlNumber: pick(fullCustomer.dlNumber, ""),
        voterId: pick(fullCustomer.voterId, ""),
        aadhaarCardDocUrl: pick(fullCustomer.aadhaarCardDocUrl, ""),
        panCardDocUrl: pick(fullCustomer.panCardDocUrl, ""),
        passportDocUrl: pick(fullCustomer.passportDocUrl, ""),
        dlDocUrl: pick(fullCustomer.dlDocUrl, ""),
        gstDocUrl: pick(fullCustomer.gstDocUrl, ""),
        addressProofDocUrl: pick(fullCustomer.addressProofDocUrl, ""),
        photoUrl: pick(fullCustomer.photoUrl, ""),
        signatureUrl: pick(fullCustomer.signatureUrl, ""),
        
        // References
        reference1,
        reference2,
      };

      const fieldValues = prefillMode === "minimal" ? baseValues : fullValues;

      // Filter out empty values
      const merged = Object.fromEntries(
        Object.entries(fieldValues).filter(([_, v]) => {
          if (v === "" || v === null || v === undefined) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        })
      );
      
      // Use setFieldsValue to populate form - this keeps fields editable
      form.setFieldsValue(merged);
      
      setSearchTerm("");
      setFilteredCustomers([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Error fetching full customer data:", error);
      // Fallback to basic data if full fetch fails
      form.setFieldsValue({
        customerId: customer._id,
        customerName: customer.customerName || "",
        primaryMobile: customer.primaryMobile || "",
      });
      setSearchTerm("");
      setFilteredCustomers([]);
      setIsOpen(false);
    } finally {
      setLoadingFullData(false);
    }
  }, [form, prefillMode]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
         setIsOpen(false);
       }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Hide credit-relevant fields ONLY when explicitly "No"
  const showCreditFields = isFinanced !== "No";
  const isCashIndividualMinimal = cashMinimalMode && !isCompany;

  if (cashMinimalMode && isCompany) {
    return (
      <div
        id="section-personal"
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
      >
        <div className="section-header mb-6 flex justify-between items-center">
          <div className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon name="Building2" size={20} />
            </div>
            <span className="text-lg font-bold text-foreground">Company Details</span>
          </div>
          <Tag className="m-0 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">
            Cash Case
          </Tag>
        </div>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <div className="relative" ref={dropdownRef}>
              <Form.Item
                label="Company Name"
                name="customerName"
                normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
              >
                <Input
                  placeholder="Enter Company Name"
                  prefix={<Icon name="Building2" size={14} className="text-muted-foreground mr-1" />}
                  autoComplete="off"
                  onChange={(e) => {
                    if (searchable) {
                      setSearchTerm(e.target.value);
                      setIsOpen(true);
                    }
                  }}
                  onFocus={() => searchable && searchTerm && setIsOpen(true)}
                />
              </Form.Item>

              {searchable && isOpen && (searchTerm || loading) && (
                <div className="absolute left-0 right-0 top-[72px] z-[500] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
                  <div className="px-3 py-2 border-b border-border bg-muted/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Icon name="Search" size={10} />
                      Select a Customer
                    </span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto no-scrollbar py-1">
                    {loading ? (
                      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Searching...</span>
                      </div>
                    ) : loadingFullData ? (
                      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Loading customer data...</span>
                      </div>
                    ) : filteredCustomers.length > 0 ? (
                      <div className="flex flex-col py-1">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/5 last:border-none group flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {c.customerName}
                              </span>
                              <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-wider">
                                #{c.displayId || c._id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="font-semibold">{c.primaryMobile || "No Mobile"}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="font-semibold">{c.panNumber || "No PAN"}</span>
                              {c.city && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span>{c.city}</span>
                                </>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      searchTerm.length > 1 && (
                        <div className="p-6 text-center text-muted-foreground text-xs font-medium">
                          No results found for "{searchTerm}"
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Date of Incorporation" name="dob">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="PAN Number" name="panNumber">
              <Input placeholder="ABCDE1234F" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="File Prepared By" name="docsPreparedBy">
              <Input placeholder="Enter name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Mobile Number"
              name="primaryMobile"
              rules={[
                { required: true, message: "Required" },
                { pattern: /^[0-9]{10}$/, message: "10 digits" },
              ]}
            >
              <Input
                placeholder="Primary Mobile"
                maxLength={10}
                prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1" />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Email ID" name="email">
              <Input placeholder="Company@Example.Com" prefix={<Icon name="Mail" size={14} className="text-muted-foreground mr-1" />} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Contact Person Name" name="contactPersonName">
              <Input placeholder="Contact Person Name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Contact Person Mobile"
              name="contactPersonMobile"
              rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits" }]}
            >
              <Input placeholder="Contact Person Mobile" maxLength={10} />
            </Form.Item>
          </Col>

          <Col xs={24} md={24}>
            <Form.Item
              label="Present Address"
              name="residenceAddress"
              normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
            >
              <TextArea rows={2} placeholder="Office Address" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Pincode" name="pincode">
              <Input placeholder="6-Digit Pincode" maxLength={6} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="City" name="city">
              <Input
                placeholder="City (Auto-Filled)"
                suffix={fetchingPincode ? <span className="text-[10px] text-muted-foreground">Loading...</span> : null}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Permanent Address is same as current?"
              name="sameAsCurrentAddress"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>

          {!sameAsCurrentAddress && (
            <>
              <Col xs={24} md={24}>
                <Form.Item
                  label="Permanent Address"
                  name="permanentAddress"
                  normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
                >
                  <TextArea rows={2} placeholder="Permanent Address" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Permanent Pincode" name="permanentPincode">
                  <Input placeholder="6-Digit Pincode" maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Permanent City" name="permanentCity">
                  <Input placeholder="City (Auto-Filled)" />
                </Form.Item>
              </Col>
            </>
          )}

          <Col xs={24} md={24}>
            <div className="section-divider" />
            <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">
              Authorised Signatory Details
            </span>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Applicant Name" name="signatory_customerName">
              <Input placeholder="Authorised Signatory Name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Primary Mobile"
              name="signatory_primaryMobile"
              rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits required" }]}
            >
              <Input placeholder="10-digit number" maxLength={10} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Date of Birth" name="signatory_dob">
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                getValueProps={(value) => ({ value: toDayjsSafe(value) })}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item label="Present / Current Address" name="signatory_address">
              <Input placeholder="House no, Street, Area" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Pincode" name="signatory_pincode">
              <Input maxLength={6} placeholder="6-digit PIN" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="City" name="signatory_city">
              <Input placeholder="City" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Designation" name="signatory_designation">
              <Input placeholder="e.g. Director" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="PAN Number" name="signatory_pan">
              <Input placeholder="ABCDE1234F" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Aadhaar Number" name="signatory_aadhaar">
              <Input placeholder="1234 5678 9012" />
            </Form.Item>
          </Col>

          <Col xs={24} md={24}>
            <div className="section-divider" />
            <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">
              Registration Details
            </span>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Is vehicle registered at GST/office address?" name="registerSameAsAadhaar">
              <Radio.Group>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>

          {registerSameAsAadhaar === "No" && (
            <Col xs={24} md={8}>
              <Form.Item label="Is vehicle registered at permanent address?" name="registerSameAsPermanent">
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No">No</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          )}

          {registerSameAsAadhaar === "No" && registerSameAsPermanent === "No" && (
            <>
              <Col xs={24} md={24}>
                <Form.Item
                  label="Registration Address"
                  name="registrationAddress"
                  normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
                >
                  <TextArea rows={2} placeholder="Registration Address" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Registration Pincode" name="registrationPincode">
                  <Input placeholder="6-Digit Pincode" maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Registration City" name="registrationCity">
                  <Input placeholder="City (Auto-Filled)" />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </div>
    );
  }

  if (isCashIndividualMinimal) {
    return (
      <div
        id="section-personal"
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
      >
        <div className="section-header mb-6 flex justify-between items-center">
          <div className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon name="User" size={20} />
            </div>
            <span className="text-lg font-bold text-foreground">Personal Details</span>
          </div>
          <Tag className="m-0 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">
            Cash Case
          </Tag>
        </div>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <div className="relative" ref={dropdownRef}>
              <Form.Item
                label="Customer Name"
                name="customerName"
                normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
              >
                <Input
                  placeholder="Enter Full Name"
                  prefix={<Icon name="User" size={14} className="text-muted-foreground mr-1" />}
                  autoComplete="off"
                  onChange={(e) => {
                    if (searchable) {
                      setSearchTerm(e.target.value);
                      setIsOpen(true);
                    }
                  }}
                  onFocus={() => searchable && searchTerm && setIsOpen(true)}
                />
              </Form.Item>

              {searchable && isOpen && (searchTerm || loading) && (
                <div className="absolute left-0 right-0 top-[72px] z-[500] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
                  <div className="px-3 py-2 border-b border-border bg-muted/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Icon name="Search" size={10} />
                      Select a Customer
                    </span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto no-scrollbar py-1">
                    {loading ? (
                      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Searching...</span>
                      </div>
                    ) : loadingFullData ? (
                      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Loading customer data...</span>
                      </div>
                    ) : filteredCustomers.length > 0 ? (
                      <div className="flex flex-col py-1">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/5 last:border-none group flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {c.customerName}
                              </span>
                              <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-wider">
                                #{c.displayId || c._id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-semibold">{c.primaryMobile || "No Mobile"}</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="font-semibold">{c.panNumber || "No PAN"}</span>
                            {c.city && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{c.city}</span>
                              </>
                            )}
                          </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      searchTerm.length > 1 && (
                        <div className="p-6 text-center text-muted-foreground text-xs font-medium">
                          No results found for "{searchTerm}"
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="S/D/W of" name="sdwOf" normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}>
              <Input placeholder="Father / Spouse Name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Date of Birth" name="dob">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Mother's Name" name="motherName" normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}>
              <Input placeholder="Mother's Name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="PAN Number" name="panNumber">
              <Input placeholder="ABCDE1234F" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Aadhaar Number" name="aadhaarNumber">
              <Input placeholder="1234 5678 9012" maxLength={14} />
            </Form.Item>
          </Col>

          <Col xs={24} md={24}>
            <Form.Item
              label="Residence Address"
              name="residenceAddress"
              normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}
            >
              <TextArea rows={2} placeholder="House No, Street, Area" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Pincode" name="pincode">
              <Input placeholder="6-Digit Pincode" maxLength={6} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="City" name="city">
              <Input
                placeholder="City (Auto-Filled)"
                suffix={fetchingPincode ? <span className="text-[10px] text-muted-foreground">Loading...</span> : null}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Mobile Number"
              name="primaryMobile"
              rules={[
                { required: true, message: "Required" },
                { pattern: /^[0-9]{10}$/, message: "10 digits" },
              ]}
            >
              <Input
                placeholder="Primary Mobile"
                maxLength={10}
                prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1" />}
                suffix={
                  <div
                    onClick={() => {
                      const current = form.getFieldValue("extraMobiles") || [];
                      form.setFieldsValue({ extraMobiles: [...current, ""] });
                    }}
                    className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                    title="Add Alternative Mobile"
                  >
                    <Icon name="Plus" size={14} />
                  </div>
                }
              />
            </Form.Item>
          </Col>

          <Form.List name="extraMobiles">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Col key={field.key} xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="Alternate Mobile Number"
                      rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits" }]}
                    >
                      <Input
                        placeholder="Mobile Number"
                        maxLength={10}
                        prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1 opacity-50" />}
                        suffix={
                          <div className="flex items-center gap-1">
                            <div
                              onClick={() => remove(field.name)}
                              className="cursor-pointer hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                              title="Remove"
                            >
                              <Icon name="Trash2" size={14} />
                            </div>
                            {index === fields.length - 1 && (
                              <div
                                onClick={() => add()}
                                className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                                title="Add Another"
                              >
                                <Icon name="Plus" size={14} />
                              </div>
                            )}
                          </div>
                        }
                      />
                    </Form.Item>
                  </Col>
                ))}
              </>
            )}
          </Form.List>

          <Col xs={24} md={8}>
            <Form.Item label="Email ID" name="email">
              <Input placeholder="Customer@Example.Com" prefix={<Icon name="Mail" size={14} className="text-muted-foreground mr-1" />} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="File Prepared By" name="docsPreparedBy">
              <Input placeholder="Enter name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={24}>
            <div className="section-divider" />
            <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">Nominee Details</span>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Nominee Name" name="nomineeName" normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}>
              <Input placeholder="Nominee Name" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Nominee DOB" name="nomineeDob">
              <DatePicker className="w-full" format="DD-MM-YYYY" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Relation" name="nomineeRelation" normalize={(value) => value?.replace(/\b\w/g, (c) => c.toUpperCase())}>
              <Input placeholder="Relation" />
            </Form.Item>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div 
        id="section-personal" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
             <Icon name="User" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">
            {isCompany ? "Company Details" : "Personal Details"}
          </span>
        </div>
        <Tag className="m-0 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">Core</Tag>
      </div>

      <Row gutter={[16, 0]}>
        {showApplicantType && (
          <Col xs={24} md={8}>
            <Form.Item label="Applicant Type" name="applicantType">
              <Radio.Group buttonStyle="solid" className="w-full flex">
                <Radio.Button
                  value="Individual"
                  className="flex-1 text-center h-10 flex items-center justify-center"
                >
                  Individual
                </Radio.Button>
                <Radio.Button
                  value="Company"
                  className="flex-1 text-center h-10 flex items-center justify-center"
                >
                  Company
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        )}

        {/* Basic identity */}
        <Col xs={24} md={8}>
          <div className="relative" ref={dropdownRef}>
            <Form.Item 
                label={isCompany ? "Company Name" : "Customer Name"} 
                name="customerName" 
                normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}
            >
              <Input 
                placeholder="Enter Full Name" 
                prefix={<Icon name="User" size={14} className="text-muted-foreground mr-1" />} 
                autoComplete="off"
                onChange={(e) => {
                    if (searchable) {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }
                }}
                onFocus={() => searchable && searchTerm && setIsOpen(true)}
              />
            </Form.Item>

            {/* Custom Search Dropdown */}
            {searchable && isOpen && (searchTerm || loading) && (
              <div className="absolute left-0 right-0 top-[72px] z-[500] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Icon name="Search" size={10} />
                    Select a Customer
                  </span>
                </div>
                <div className="max-h-[280px] overflow-y-auto no-scrollbar py-1">
                  {loading ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Searching...</span>
                    </div>
                  ) : loadingFullData ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
                        <Spin size="small" />
                        <span className="text-xs font-medium">Loading customer data...</span>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <div className="flex flex-col py-1">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => handleCustomerSelect(c)}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/5 last:border-none group flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {c.customerName}
                            </span>
                            <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-wider">
                                #{c.displayId || c._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-semibold">{c.primaryMobile || "No Mobile"}</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="font-semibold">{c.panNumber || "No PAN"}</span>
                            {c.city && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{c.city}</span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    searchTerm.length > 1 && <div className="p-6 text-center text-muted-foreground text-xs font-medium">No results found for "{searchTerm}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Col>

        {!isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="S/D/W of" name="sdwOf" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
              <Input placeholder="Father / Spouse Name" />
            </Form.Item>
          </Col>
        )}

        {!isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Gender" name="gender">
              <Select placeholder="Select Gender" showSearch filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              } allowClear>
                <Option value="Male">Male</Option>
                <Option value="Female">Female</Option>
              </Select>
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={8}>
          <Form.Item label={isCompany ? "Date of Incorporation" : "Date of Birth"} name="dob">
            <DatePicker className="w-full" format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        {!isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Mother's Name" name="motherName" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
              <Input placeholder="Mother's Name" />
            </Form.Item>
          </Col>
        )}

        {/* Email ID (Moved from bottom) */}
        <Col xs={24} md={8}>
          <Form.Item label="Email ID" name="email">
            <Input placeholder="Customer@Example.Com" prefix={<Icon name="Mail" size={14} className="text-muted-foreground mr-1" />} />
          </Form.Item>
        </Col>

        {isCompany && (
          <Col xs={24} md={8}>
            <Form.Item label="Contact Person Name" name="contactPersonName">
              <Input placeholder="Contact Person Name" />
            </Form.Item>
          </Col>
        )}

        {isCompany && (
          <Col xs={24} md={8}>
            <Form.Item
              label="Contact Person Mobile"
              name="contactPersonMobile"
              rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits" }]}
            >
              <Input placeholder="Contact Person Mobile" maxLength={10} />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={24}>
          <Form.Item
            label={isCompany ? "Present Address" : "Residence Address"}
            name="residenceAddress"
            normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}
          >
            <TextArea rows={2} placeholder={isCompany ? "Office Address" : "House No, Street, Area"} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label={isCompany ? "Present Pincode" : "Pincode"} name="pincode">
            <Input placeholder="6-Digit Pincode" maxLength={6} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label={isCompany ? "Present City" : "City"} name="city">
            <Input placeholder="City (Auto-Filled)" suffix={fetchingPincode ? <span className="text-[10px] text-muted-foreground">Loading...</span> : null} />
          </Form.Item>
        </Col>

        {/* ===== CREDIT-RELEVANT FIELDS ===== */}
        {showCreditFields && !isCompany && (
          <>
            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Years at current City" name="yearsInCurrentCity">
                <InputNumber min={0} className="w-full" placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Years at current Residence" name="yearsInCurrentHouse">
                <InputNumber min={0} className="w-full" placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="House Type" name="houseType">
                <Select placeholder="Select House Type" showSearch filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                } allowClear>
                  <Option value="owned">Owned</Option>
                  <Option value="parental">Parental</Option>
                  <Option value="company">Company Provided</Option>
                  <Option value="rented">Rented</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
               <Form.Item label="Education" className="mb-0">
                 <Form.Item name="education" className={education === 'others' ? 'mb-2' : 'mb-6'}>
                    <Select placeholder="Select Education" showSearch filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    } allowClear>
                      <Option value="Undergraduate">Undergraduate</Option>
                      <Option value="Graduate">Graduate</Option>
                      <Option value="Postgraduate">Post Graduate & above</Option>
                      <Option value="Others">Others</Option>
                    </Select>
                 </Form.Item>
                 {education === 'others' && (
                    <Form.Item name="educationOther" rules={[{ required: true, message: 'Please specify' }]} normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                       <Input placeholder="Please Specify" />
                    </Form.Item>
                 )}
               </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Marital Status" name="maritalStatus">
                <Select placeholder="Select Marital Status" showSearch filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                } allowClear>
                  <Option value="Married">Married</Option>
                  <Option value="Unmarried">Unmarried</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Dependents" name="dependents">
                <Input placeholder="Number Of Dependents" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Address Type" name="addressType">
                <Select options={ADDRESS_TYPE_OPTIONS} placeholder="Select address type" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Identity Proof" name="identityProofType">
                <Select options={IDENTITY_OPTIONS} placeholder="Select identity proof" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Identity Proof Number" name="identityProofNumber">
                <Input placeholder="Enter identity proof number" />
              </Form.Item>
            </Col>

            {(identityProofType === "PASSPORT" || identityProofType === "DRIVING_LICENSE") && (
              <Col xs={24} md={8} className="mt-4">
                <Form.Item label="Identity Proof Expiry" name="identityProofExpiry">
                  <DatePicker className="w-full" format="DD-MM-YYYY" />
                </Form.Item>
              </Col>
            )}

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Address Proof (type)" name="addressProofType">
                <Select options={ADDRESS_PROOF_OPTIONS} placeholder="Select address proof type" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Address Proof Number" name="addressProofNumber">
                <Input placeholder="Enter address proof number" />
              </Form.Item>
            </Col>
          </>
        )}

        <Col xs={24} md={8} className="mt-4">
          <Form.Item
            label="Primary Mobile"
            name="primaryMobile"
            rules={[
              { required: true, message: "Required" },
              { pattern: /^[0-9]{10}$/, message: "10 digits" },
            ]}
          >
            <Input
              placeholder="Primary Mobile"
              maxLength={10}
              prefix={
                <Icon
                  name="Phone"
                  size={14}
                  className="text-muted-foreground mr-1"
                />
              }
              suffix={
                !isCompany ? (
                  <div
                    onClick={() => {
                      const current = form.getFieldValue("extraMobiles") || [];
                      form.setFieldsValue({ extraMobiles: [...current, ""] });
                    }}
                    className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                    title="Add Alternative Mobile"
                  >
                    <Icon name="Plus" size={14} />
                  </div>
                ) : null
              }
            />
          </Form.Item>
        </Col>

        <Form.List name="extraMobiles">
          {(fields, { add, remove }) => (
            <>
              {!isCompany &&
                fields.map((field, index) => (
                  <Col key={field.key} xs={24} md={8} className="mt-4">
                    <Form.Item
                      {...field}
                      label="Alt Mobile"
                      rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits" }]}
                    >
                      <Input
                        placeholder="Mobile Number"
                        maxLength={10}
                        prefix={
                          <Icon
                            name="Phone"
                            size={14}
                            className="text-muted-foreground mr-1 opacity-50"
                          />
                        }
                        suffix={
                          <div className="flex items-center gap-1">
                            <div
                              onClick={() => remove(field.name)}
                              className="cursor-pointer hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                              title="Remove"
                            >
                              <Icon name="Trash2" size={14} />
                            </div>
                            {index === fields.length - 1 && (
                              <div
                                onClick={() => add()}
                                className="cursor-pointer hover:bg-primary/10 text-primary rounded-md p-1 transition-colors flex items-center justify-center h-6 w-6"
                                title="Add Another"
                              >
                                <Icon name="Plus" size={14} />
                              </div>
                            )}
                          </div>
                        }
                      />
                    </Form.Item>
                  </Col>
                ))}
            </>
          )}
        </Form.List>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item
            label="Permanent Address is same as current?"
            name="sameAsCurrentAddress"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>

        {!sameAsCurrentAddress && (
          <>
            <Col xs={24} md={24}>
              <Form.Item
                label="Permanent Address"
                name="permanentAddress"
                normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}
              >
                <TextArea rows={2} placeholder="Permanent Address" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Permanent Pincode" name="permanentPincode">
                <Input placeholder="6-Digit Pincode" maxLength={6} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Permanent City" name="permanentCity">
                <Input placeholder="City (Auto-Filled)" />
              </Form.Item>
            </Col>
          </>
        )}

        {showCreditFields && (
          <>
            <Col xs={24} md={8}>
              <Form.Item label="Is Co-Applicant Applicable" name="hasCoApplicant" valuePropName="checked">
                <Switch disabled={isCompany} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Is Guarantor Applicable" name="hasGuarantor" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </>
        )}

        {isCompany && !cashMinimalMode && (
          <>
            <Col xs={24} md={24}>
              <div className="section-divider" />
              <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">
                Co-Applicant Snapshot
              </span>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Co-Applicant Name" name="co_customerName">
                <Input placeholder="Co-Applicant Name" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Co-Applicant Mobile"
                name="co_primaryMobile"
                rules={[{ pattern: /^[0-9]{10}$/, message: "10 digits" }]}
              >
                <Input placeholder="Co-Applicant Mobile" maxLength={10} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Co-Applicant PAN" name="co_pan">
                <Input placeholder="ABCDE1234F" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Co-Applicant DOB" name="co_dob">
                <DatePicker
                  className="w-full"
                  format="DD-MM-YYYY"
                  getValueProps={(value) => ({ value: toDayjsSafe(value) })}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item label="Co-Applicant Address" name="co_address">
                <Input placeholder="Co-Applicant Address" />
              </Form.Item>
            </Col>
          </>
        )}

        {!isCompany && (
          <>
            <Col xs={24} md={24}>
              <div className="section-divider" />
              <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">Nominee Details</span>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Nominee Name" name="nomineeName" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                <Input placeholder="Nominee Name" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Nominee DOB" name="nomineeDob">
                <DatePicker className="w-full" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Nominee Relation" name="nomineeRelation" normalize={(value) => value?.replace(/\b\w/g, c => c.toUpperCase())}>
                <Input placeholder="Relation" />
              </Form.Item>
            </Col>
          </>
        )}
      </Row>
    </div>
  );
};

export default PersonalDetails;
