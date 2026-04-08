import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Typography,
  Upload,
} from "antd";
import { Check } from "lucide-react";

const { Text, Title } = Typography;
const { Dragger } = Upload;

const STEP_TITLES = [
  "Step 1: Customer Information",
  "Step 2: Vehicle Details",
  "Step 3: Previous Policy Details",
  "Step 4: Insurance Quotes",
  "Step 5: New Policy Details",
  "Step 6: Documents",
];

const durationOptions = [
  "1yr OD + 1yr TP",
  "1yr OD + 3yr TP",
  "2yr OD + 3yr TP",
  "3yr OD + 3yr TP",
];

const addOnCatalog = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

const requiredDocumentTags = [
  "RC",
  "Form 29",
  "Form 30 page 1",
  "Form 30 page 2",
  "Pan Number",
  "GST/Adhaar Card",
  "Previous Year Policy",
  "New Year Policy",
];

const initialFormState = {
  buyerType: "Individual",
  vehicleType: "New Car",
  policyDoneBy: "Autocredits India LLP",
  brokerName: "",
  sourceOrigin: "",
  employeeName: "",

  customerName: "",
  companyName: "",
  contactPersonName: "",
  mobile: "",
  alternatePhone: "",
  email: "",
  gender: "",
  panNumber: "",
  aadhaarNumber: "",
  gstNumber: "",
  residenceAddress: "",
  pincode: "",
  city: "",

  nomineeName: "",
  nomineeRelationship: "",
  nomineeAge: "",
  referenceName: "",
  referencePhone: "",

  registrationNumber: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleVariant: "",
  cubicCapacity: "",
  engineNumber: "",
  chassisNumber: "",
  typesOfVehicle: "Four Wheeler",
  manufactureMonth: "",
  manufactureYear: "",

  previousInsuranceCompany: "Bajaj General Insurance Limited",
  previousPolicyNumber: "",
  previousPolicyType: "Comprehensive",
  previousPolicyStartDate: "",
  previousPolicyDuration: "1yr OD + 1yr TP",
  previousOdExpiryDate: "",
  previousTpExpiryDate: "",
  claimTakenLastYear: "No",
  previousNcbDiscount: 50,
  previousHypothecation: "Not Applicable",
  previousRemarks: "",

  newInsuranceCompany: "",
  newPolicyType: "Comprehensive",
  newPolicyNumber: "",
  newIssueDate: "",
  newPolicyStartDate: "",
  newInsuranceDuration: "1yr OD + 1yr TP",
  newOdExpiryDate: "",
  newTpExpiryDate: "",
  newNcbDiscount: 0,
  newIdvAmount: 0,
  newTotalPremium: 0,
  newHypothecation: "Not Applicable",
  newRemarks: "",
};

const initialQuoteDraft = {
  insuranceCompany: "",
  coverageType: "Comprehensive",
  vehicleIdv: 0,
  cngIdv: 0,
  accessoriesIdv: 0,
  policyDuration: "1yr OD + 3yr TP",
  ncbDiscount: 50,
  odAmount: 0,
  thirdPartyAmount: 0,
  addOnsAmount: 0,
  addOns: addOnCatalog.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
};

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

const yearsFromDuration = (duration) => {
  const text = String(duration || "");
  const odMatch = text.match(/(\d)yr\s*OD/i);
  const tpMatch = text.match(/(\d)yr\s*TP/i);
  return {
    odYears: Number(odMatch?.[1] || 1),
    tpYears: Number(tpMatch?.[1] || 1),
  };
};

const calcExpiryDate = (startDate, years) => {
  if (!startDate) return "";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + Number(years || 1));
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const mapDurationToKey = (duration) =>
  String(duration || "")
    .toLowerCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_");

const validateStep1 = (data) => {
  const errors = {};
  const isCompany = data.buyerType === "Company";
  if (!data.employeeName.trim())
    errors.employeeName = "Employee name is required";
  if (!data.mobile.trim()) errors.mobile = "Mobile number is required";
  else if (!/^\d{10}$/.test(data.mobile.trim()))
    errors.mobile = "Enter a valid 10-digit mobile number";
  if (
    data.alternatePhone.trim() &&
    !/^\d{10}$/.test(data.alternatePhone.trim())
  )
    errors.alternatePhone = "Enter a valid 10-digit alternate number";
  if (!data.email.trim()) errors.email = "Email address is required";
  if (!data.pincode.trim()) errors.pincode = "Pincode is required";
  else if (!/^\d{6}$/.test(data.pincode.trim()))
    errors.pincode = "Enter a valid 6-digit pincode";
  if (!data.city.trim()) errors.city = "City is required";
  if (isCompany) {
    if (!data.companyName.trim())
      errors.companyName = "Company name is required";
    if (!data.contactPersonName.trim())
      errors.contactPersonName = "Contact person name is required";
    if (!data.panNumber.trim()) errors.panNumber = "PAN number is required";
    if (!data.residenceAddress.trim())
      errors.residenceAddress = "Residence address is required";
  } else {
    if (!data.customerName.trim())
      errors.customerName = "Customer name is required";
    if (!data.gender.trim()) errors.gender = "Gender is required";
    if (!data.residenceAddress.trim())
      errors.residenceAddress = "Residence address is required";
  }
  return errors;
};

const validateStep2 = (data) => {
  const errors = {};
  if (!data.registrationNumber.trim())
    errors.registrationNumber = "Registration number is required";
  if (!data.vehicleMake.trim()) errors.vehicleMake = "Vehicle make is required";
  if (!data.vehicleModel.trim())
    errors.vehicleModel = "Vehicle model is required";
  if (!data.vehicleVariant.trim())
    errors.vehicleVariant = "Vehicle variant is required";
  if (!data.engineNumber.trim())
    errors.engineNumber = "Engine number is required";
  if (!data.chassisNumber.trim())
    errors.chassisNumber = "Chassis number is required";
  if (!data.manufactureMonth.trim())
    errors.manufactureMonth = "Manufacture month is required";
  if (!data.manufactureYear.trim())
    errors.manufactureYear = "Manufacture year is required";
  return errors;
};

const NewInsuranceCaseForm = ({
  onCancel,
  onSubmit,
  mode = "create",
  initialValues = null,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ...initialFormState,
    ...(initialValues || {}),
  });
  const [quoteDraft, setQuoteDraft] = useState(initialQuoteDraft);
  const [quotes, setQuotes] = useState([]);
  const [acceptedQuoteId, setAcceptedQuoteId] = useState(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    setFormData((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  const isCompany = formData.buyerType === "Company";
  const isNewCar = formData.vehicleType === "New Car";
  const step1Errors = useMemo(() => validateStep1(formData), [formData]);
  const step2Errors = useMemo(() => validateStep2(formData), [formData]);
  const acceptedQuote = quotes.find((q) => q.id === acceptedQuoteId) || null;
  const docsTaggedCount = documents.filter((d) => d.tag).length;
  const allUploadedDocsTagged =
    documents.length > 0 && docsTaggedCount === documents.length;

  useEffect(() => {
    if (isNewCar && step === 3) {
      setStep(4);
    }
  }, [isNewCar, step]);

  const quoteComputed = useMemo(() => {
    const selectedAddOnsTotal = Object.values(quoteDraft.addOns || {}).reduce(
      (sum, v) => sum + Number(v || 0),
      0,
    );
    const addOnsTotal =
      Number(quoteDraft.addOnsAmount || 0) + selectedAddOnsTotal;
    const totalIdv =
      Number(quoteDraft.vehicleIdv || 0) +
      Number(quoteDraft.cngIdv || 0) +
      Number(quoteDraft.accessoriesIdv || 0);
    const basePremium =
      Number(quoteDraft.odAmount || 0) +
      Number(quoteDraft.thirdPartyAmount || 0) +
      addOnsTotal;
    const ncbAmount = (basePremium * Number(quoteDraft.ncbDiscount || 0)) / 100;
    const taxableAmount = Math.max(basePremium - ncbAmount, 0);
    const gstAmount = taxableAmount * 0.18;
    const totalPremium = taxableAmount + gstAmount;
    return {
      selectedAddOnsTotal,
      addOnsTotal,
      totalIdv,
      basePremium,
      ncbAmount,
      taxableAmount,
      gstAmount,
      totalPremium,
    };
  }, [quoteDraft]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event?.target?.value }));
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStepValidation = () => {
    if (step === 1) return Object.keys(step1Errors).length === 0;
    if (step === 2) return Object.keys(step2Errors).length === 0;
    if (step === 4) return quotes.length > 0;
    return true;
  };

  const goNext = () => {
    setShowErrors(true);
    if (!handleStepValidation()) return;
    setStep((prev) => {
      if (isNewCar && prev === 2) return 4;
      return Math.min(prev + 1, 6);
    });
    setShowErrors(false);
  };

  const goBack = () => {
    setStep((prev) => {
      if (isNewCar && prev === 4) return 2;
      return Math.max(prev - 1, 1);
    });
    setShowErrors(false);
  };

  const addQuote = () => {
    if (!quoteDraft.insuranceCompany.trim()) return;
    const newQuote = {
      id: Date.now(),
      ...quoteDraft,
      totalIdv: quoteComputed.totalIdv,
      addOnsTotal: quoteComputed.addOnsTotal,
      taxableAmount: quoteComputed.taxableAmount,
      gstAmount: quoteComputed.gstAmount,
      totalPremium: quoteComputed.totalPremium,
      isAccepted: quotes.length === 0,
    };
    setQuotes((prev) => [...prev, newQuote]);
    if (quotes.length === 0) setAcceptedQuoteId(newQuote.id);
    setQuoteDraft(initialQuoteDraft);
  };

  const acceptQuote = (id) => {
    setAcceptedQuoteId(id);
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    setFormData((prev) => {
      const odTp = yearsFromDuration(q.policyDuration);
      const startDate =
        prev.newPolicyStartDate || new Date().toISOString().slice(0, 10);
      return {
        ...prev,
        newInsuranceCompany: q.insuranceCompany,
        newPolicyType: q.coverageType,
        newInsuranceDuration: q.policyDuration,
        newNcbDiscount: q.ncbDiscount,
        newIdvAmount: q.totalIdv,
        newTotalPremium: Math.round(q.totalPremium),
        newPolicyStartDate: startDate,
        newOdExpiryDate: calcExpiryDate(startDate, odTp.odYears),
        newTpExpiryDate: calcExpiryDate(startDate, odTp.tpYears),
      };
    });
  };

  const handlePreviousPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const y = yearsFromDuration(next.previousPolicyDuration);
      next.previousOdExpiryDate = calcExpiryDate(
        next.previousPolicyStartDate,
        y.odYears,
      );
      next.previousTpExpiryDate = calcExpiryDate(
        next.previousPolicyStartDate,
        y.tpYears,
      );
      return next;
    });
  };

  const handleNewPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const y = yearsFromDuration(next.newInsuranceDuration);
      next.newOdExpiryDate = calcExpiryDate(next.newPolicyStartDate, y.odYears);
      next.newTpExpiryDate = calcExpiryDate(next.newPolicyStartDate, y.tpYears);
      return next;
    });
  };

  const handleFilesUpload = (fileList) => {
    const incoming = Array.from(fileList || []).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      tag: "",
    }));
    setDocuments((prev) => [...prev, ...incoming]);
  };

  const handleSubmitFinal = (event) => {
    event.preventDefault();
    if (step !== 6) return;
    const payload = {
      ...formData,
      quotes,
      acceptedQuoteId,
      documents,
      mode,
      createdAt: new Date().toISOString(),
      caseId: `INS-${Date.now()}`,
    };
    onSubmit?.(payload);
    setStep(1);
    setFormData(initialFormState);
    setQuoteDraft(initialQuoteDraft);
    setQuotes([]);
    setAcceptedQuoteId(null);
    setSelectedQuoteIds([]);
    setDocuments([]);
    setShowErrors(false);
  };

  const visibleSteps = useMemo(() => {
    // If New Car, we skip "Previous Policy Details" (step 3 in original)
    const rows = STEP_TITLES.map((title, idx) => ({
      originalStep: idx + 1,
      title,
    })).filter((s) => !(isNewCar && s.originalStep === 3));
    return rows;
  }, [isNewCar]);

  const stepIndex = useMemo(() => {
    return Math.max(
      0,
      visibleSteps.findIndex((s) => s.originalStep === step),
    );
  }, [visibleSteps, step]);

  const currentStepTitle = useMemo(() => {
    if (isNewCar && step === 4) return "Step 3: Insurance Quotes";
    return STEP_TITLES[step - 1];
  }, [isNewCar, step]);

  const stepHelpText = useMemo(() => {
    if (step === 1) return "Fill personal, contact and nominee details.";
    if (step === 2) return "Provide accurate vehicle information.";
    if (step === 3 && !isNewCar) return "For renewal cases & policy already expired cases.";
    if (step === 4) return "Add and manage quote options (at least 1 quote required).";
    if (step === 5) return "Policy details (auto-filled from accepted quote).";
    if (step === 6) return "Upload and tag documents (recommended).";
    return "";
  }, [step, isNewCar]);

  const stepErrorsAlert = useMemo(() => {
    if (!showErrors) return null;
    if (step === 1 && Object.keys(step1Errors).length) {
      return (
        <Alert
          type="error"
          showIcon
          message="Please fix required fields in Customer Information."
          description="Some mandatory fields are missing or invalid."
        />
      );
    }
    if (step === 2 && Object.keys(step2Errors).length) {
      return (
        <Alert
          type="error"
          showIcon
          message="Please fix required fields in Vehicle Details."
          description="Some mandatory fields are missing or invalid."
        />
      );
    }
    if (step === 4 && quotes.length === 0) {
      return (
        <Alert
          type="error"
          showIcon
          message="At least 1 quote is required to continue."
        />
      );
    }
    return null;
  }, [showErrors, step, step1Errors, step2Errors, quotes.length]);

  const docRows = useMemo(() => {
    return (documents || []).map((d) => ({
      key: d.id,
      ...d,
      sizeKb: Math.round((Number(d.size || 0) / 1024) || 0),
    }));
  }, [documents]);

  const quoteRows = useMemo(() => {
    return (quotes || []).map((q) => ({
      key: q.id,
      ...q,
    }));
  }, [quotes]);

  return (
    <Card bordered>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {currentStepTitle}
          </Title>
          <Text type="secondary">{stepHelpText}</Text>
        </div>

        <Steps
          current={stepIndex}
          items={visibleSteps.map((s) => ({
            title: s.title.replace(/^Step\s*\d+\s*:\s*/i, ""),
            onClick: () => setStep(s.originalStep),
          }))}
        />

        {stepErrorsAlert}

        <form onSubmit={handleSubmitFinal}>
        {step === 1 && (
          <>
            <Card size="small" title="Basic Setup" bordered>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Buyer Type *</Text>
                  <div style={{ marginTop: 6 }}>
                    <Radio.Group
                      value={formData.buyerType}
                      onChange={(e) => setField("buyerType", e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: "Individual", value: "Individual" },
                        { label: "Company", value: "Company" },
                      ]}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Vehicle Type *</Text>
                  <div style={{ marginTop: 6 }}>
                    <Radio.Group
                      value={formData.vehicleType}
                      onChange={(e) => setField("vehicleType", e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: "New Car", value: "New Car" },
                        { label: "Used Car", value: "Used Car" },
                      ]}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Done By *</Text>
                  <Input
                    value={formData.policyDoneBy}
                    onChange={handleChange("policyDoneBy")}
                    placeholder="Autocredits India LLP"
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Broker Name</Text>
                  <Input
                    value={formData.brokerName}
                    onChange={handleChange("brokerName")}
                    placeholder="Broker (optional)"
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24}>
                  <Text strong>Source Origin</Text>
                  <Input
                    value={formData.sourceOrigin}
                    onChange={handleChange("sourceOrigin")}
                    placeholder="From where we got the policy client"
                    style={{ marginTop: 6 }}
                  />
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Customer Information" bordered>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Employee Name *</Text>
                  <Input
                    value={formData.employeeName}
                    onChange={handleChange("employeeName")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.employeeName ? "error" : ""}
                    placeholder="Enter employee name"
                  />
                  {showErrors && step1Errors.employeeName ? (
                    <Text type="danger">{step1Errors.employeeName}</Text>
                  ) : null}
                </Col>
              {isCompany ? (
                <>
                  <Col xs={24} md={12}>
                    <Text strong>Company Name *</Text>
                    <Input
                      value={formData.companyName}
                      onChange={handleChange("companyName")}
                      style={{ marginTop: 6 }}
                      status={showErrors && step1Errors.companyName ? "error" : ""}
                      placeholder="Enter company name"
                    />
                    {showErrors && step1Errors.companyName ? (
                      <Text type="danger">{step1Errors.companyName}</Text>
                    ) : null}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Contact Person Name *</Text>
                    <Input
                      value={formData.contactPersonName}
                      onChange={handleChange("contactPersonName")}
                      style={{ marginTop: 6 }}
                      status={showErrors && step1Errors.contactPersonName ? "error" : ""}
                      placeholder="Enter contact person name"
                    />
                    {showErrors && step1Errors.contactPersonName ? (
                      <Text type="danger">{step1Errors.contactPersonName}</Text>
                    ) : null}
                  </Col>
                </>
              ) : (
                <Col xs={24} md={12}>
                  <Text strong>Customer Name *</Text>
                  <Input
                    value={formData.customerName}
                    onChange={handleChange("customerName")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.customerName ? "error" : ""}
                    placeholder="Enter customer name"
                  />
                  {showErrors && step1Errors.customerName ? (
                    <Text type="danger">{step1Errors.customerName}</Text>
                  ) : null}
                </Col>
              )}
                <Col xs={24} md={12}>
                  <Text strong>Mobile Number *</Text>
                  <Input
                    addonBefore="+91"
                    value={formData.mobile}
                    onChange={handleChange("mobile")}
                    maxLength={10}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.mobile ? "error" : ""}
                    placeholder="10-digit mobile number"
                  />
                  {showErrors && step1Errors.mobile ? (
                    <Text type="danger">{step1Errors.mobile}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Alternate Phone Number</Text>
                  <Input
                    addonBefore="+91"
                    value={formData.alternatePhone}
                    onChange={handleChange("alternatePhone")}
                    maxLength={10}
                    style={{ marginTop: 6 }}
                    placeholder="Optional"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Email Address *</Text>
                  <Input
                    value={formData.email}
                    onChange={handleChange("email")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.email ? "error" : ""}
                    placeholder={isCompany ? "Company email address" : "Email address"}
                  />
                  {showErrors && step1Errors.email ? (
                    <Text type="danger">{step1Errors.email}</Text>
                  ) : null}
                </Col>
              {!isCompany ? (
                <Col xs={24} md={12}>
                  <Text strong>Gender *</Text>
                  <Select
                    value={formData.gender || undefined}
                    onChange={(v) => setField("gender", v)}
                    style={{ width: "100%", marginTop: 6 }}
                    status={showErrors && step1Errors.gender ? "error" : ""}
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                      { label: "Other", value: "Other" },
                    ]}
                    placeholder="Select gender"
                  />
                  {showErrors && step1Errors.gender ? (
                    <Text type="danger">{step1Errors.gender}</Text>
                  ) : null}
                </Col>
              ) : null}
                <Col xs={24} md={12}>
                  <Text strong>PAN Number {isCompany ? "*" : ""}</Text>
                  <Input
                    value={formData.panNumber}
                    onChange={handleChange("panNumber")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.panNumber ? "error" : ""}
                    placeholder="ABCDE1234F"
                  />
                  {showErrors && step1Errors.panNumber ? (
                    <Text type="danger">{step1Errors.panNumber}</Text>
                  ) : null}
                </Col>
              {isCompany ? (
                <Col xs={24} md={12}>
                  <Text strong>GST Number</Text>
                  <Input
                    value={formData.gstNumber}
                    onChange={handleChange("gstNumber")}
                    style={{ marginTop: 6 }}
                    placeholder="Optional"
                  />
                </Col>
              ) : (
                <Col xs={24} md={12}>
                  <Text strong>Aadhaar Number</Text>
                  <Input
                    value={formData.aadhaarNumber}
                    onChange={handleChange("aadhaarNumber")}
                    style={{ marginTop: 6 }}
                    placeholder="Optional"
                  />
                </Col>
              )}
                <Col xs={24} md={12}>
                  <Text strong>{isCompany ? "Office Address *" : "Residence Address *"}</Text>
                  <Input.TextArea
                    rows={2}
                    value={formData.residenceAddress}
                    onChange={handleChange("residenceAddress")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.residenceAddress ? "error" : ""}
                    placeholder="Enter complete address"
                  />
                  {showErrors && step1Errors.residenceAddress ? (
                    <Text type="danger">{step1Errors.residenceAddress}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Pincode *</Text>
                  <Input
                    value={formData.pincode}
                    onChange={handleChange("pincode")}
                    maxLength={6}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.pincode ? "error" : ""}
                    placeholder="6-digit pincode"
                  />
                  {showErrors && step1Errors.pincode ? (
                    <Text type="danger">{step1Errors.pincode}</Text>
                  ) : null}
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>City *</Text>
                  <Input
                    value={formData.city}
                    onChange={handleChange("city")}
                    style={{ marginTop: 6 }}
                    status={showErrors && step1Errors.city ? "error" : ""}
                    placeholder="City"
                  />
                  {showErrors && step1Errors.city ? (
                    <Text type="danger">{step1Errors.city}</Text>
                  ) : null}
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="Nominee (Optional)" bordered>
                  <Row gutter={[12, 12]}>
                    <Col span={24}>
                      <Input
                        value={formData.nomineeName}
                        onChange={handleChange("nomineeName")}
                        placeholder="Nominee Name"
                      />
                    </Col>
                    <Col span={24}>
                      <Input
                        value={formData.nomineeRelationship}
                        onChange={handleChange("nomineeRelationship")}
                        placeholder="Relationship"
                      />
                    </Col>
                    <Col span={24}>
                      <InputNumber
                        min={0}
                        value={Number(formData.nomineeAge || 0) || 0}
                        onChange={(v) => setField("nomineeAge", String(v ?? ""))}
                        style={{ width: "100%" }}
                        placeholder="Nominee Age"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="Reference (Optional)" bordered>
                  <Row gutter={[12, 12]}>
                    <Col span={24}>
                      <Input
                        value={formData.referenceName}
                        onChange={handleChange("referenceName")}
                        placeholder="Reference Name"
                      />
                    </Col>
                    <Col span={24}>
                      <Input
                        value={formData.referencePhone}
                        onChange={handleChange("referencePhone")}
                        placeholder="Reference Phone"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {step === 2 && (
          <Card size="small" title="Vehicle Details" bordered>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Registration Number *</Text>
                <Input
                  value={formData.registrationNumber}
                  onChange={handleChange("registrationNumber")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.registrationNumber ? "error" : ""}
                  placeholder="e.g. DL01AB1234"
                />
                {showErrors && step2Errors.registrationNumber ? (
                  <Text type="danger">{step2Errors.registrationNumber}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Vehicle Make *</Text>
                <Input
                  value={formData.vehicleMake}
                  onChange={handleChange("vehicleMake")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.vehicleMake ? "error" : ""}
                  placeholder="e.g. Hyundai"
                />
                {showErrors && step2Errors.vehicleMake ? (
                  <Text type="danger">{step2Errors.vehicleMake}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Vehicle Model *</Text>
                <Input
                  value={formData.vehicleModel}
                  onChange={handleChange("vehicleModel")}
                  style={{ marginTop: 6 }}
                  disabled={!formData.vehicleMake}
                  status={showErrors && step2Errors.vehicleModel ? "error" : ""}
                  placeholder="Select make first"
                />
                {showErrors && step2Errors.vehicleModel ? (
                  <Text type="danger">{step2Errors.vehicleModel}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Vehicle Variant *</Text>
                <Input
                  value={formData.vehicleVariant}
                  onChange={handleChange("vehicleVariant")}
                  style={{ marginTop: 6 }}
                  disabled={!formData.vehicleMake || !formData.vehicleModel}
                  status={showErrors && step2Errors.vehicleVariant ? "error" : ""}
                  placeholder="Variant"
                />
                {showErrors && step2Errors.vehicleVariant ? (
                  <Text type="danger">{step2Errors.vehicleVariant}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Cubic Capacity (cc)</Text>
                <Input
                  value={formData.cubicCapacity}
                  onChange={handleChange("cubicCapacity")}
                  style={{ marginTop: 6 }}
                  placeholder="Optional"
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Engine Number *</Text>
                <Input
                  value={formData.engineNumber}
                  onChange={handleChange("engineNumber")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.engineNumber ? "error" : ""}
                  placeholder="Engine number"
                />
                {showErrors && step2Errors.engineNumber ? (
                  <Text type="danger">{step2Errors.engineNumber}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Chassis Number *</Text>
                <Input
                  value={formData.chassisNumber}
                  onChange={handleChange("chassisNumber")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.chassisNumber ? "error" : ""}
                  placeholder="Chassis number"
                />
                {showErrors && step2Errors.chassisNumber ? (
                  <Text type="danger">{step2Errors.chassisNumber}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Types of Vehicle</Text>
                <Select
                  value={formData.typesOfVehicle || "Four Wheeler"}
                  onChange={(v) => setField("typesOfVehicle", v)}
                  style={{ width: "100%", marginTop: 6 }}
                  options={[{ label: "Four Wheeler", value: "Four Wheeler" }]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Manufacture Month *</Text>
                <Input
                  value={formData.manufactureMonth}
                  onChange={handleChange("manufactureMonth")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.manufactureMonth ? "error" : ""}
                  placeholder="e.g. 07"
                />
                {showErrors && step2Errors.manufactureMonth ? (
                  <Text type="danger">{step2Errors.manufactureMonth}</Text>
                ) : null}
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Manufacture Year *</Text>
                <Input
                  value={formData.manufactureYear}
                  onChange={handleChange("manufactureYear")}
                  style={{ marginTop: 6 }}
                  status={showErrors && step2Errors.manufactureYear ? "error" : ""}
                  placeholder="e.g. 2026"
                />
                {showErrors && step2Errors.manufactureYear ? (
                  <Text type="danger">{step2Errors.manufactureYear}</Text>
                ) : null}
              </Col>
            </Row>
            <Divider style={{ marginBlock: 12 }} />
            <Alert
              type="info"
              showIcon
              message="All vehicle details must be accurate and will be verified during policy issuance."
            />
          </Card>
        )}

        {step === 3 && !isNewCar && (
          <Card size="small" title="Previous Policy Details" bordered>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Insurance Company</Text>
                <Input
                  value={formData.previousInsuranceCompany}
                  onChange={handleChange("previousInsuranceCompany")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Number</Text>
                <Input
                  value={formData.previousPolicyNumber}
                  onChange={handleChange("previousPolicyNumber")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Type</Text>
                <Select
                  value={formData.previousPolicyType}
                  onChange={(v) => setField("previousPolicyType", v)}
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Comprehensive", value: "Comprehensive" },
                    { label: "Third Party", value: "Third Party" },
                    { label: "Own Damage", value: "Own Damage" },
                  ]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Start Date</Text>
                <Input
                  type="date"
                  value={formData.previousPolicyStartDate}
                  onChange={(e) =>
                    handlePreviousPolicyStartOrDuration({ previousPolicyStartDate: e.target.value })
                  }
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Duration</Text>
                <Select
                  value={formData.previousPolicyDuration}
                  onChange={(v) =>
                    handlePreviousPolicyStartOrDuration({ previousPolicyDuration: v })
                  }
                  style={{ width: "100%", marginTop: 6 }}
                  options={durationOptions.map((d) => ({ label: d, value: d }))}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>OD Expiry Date</Text>
                <Input
                  type="date"
                  value={formData.previousOdExpiryDate}
                  onChange={handleChange("previousOdExpiryDate")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>TP Expiry Date</Text>
                <Input
                  type="date"
                  value={formData.previousTpExpiryDate}
                  onChange={handleChange("previousTpExpiryDate")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Claim Taken Last Year</Text>
                <div style={{ marginTop: 6 }}>
                  <Radio.Group
                    value={formData.claimTakenLastYear}
                    onChange={(e) => setField("claimTakenLastYear", e.target.value)}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                    optionType="button"
                    buttonStyle="solid"
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>NCB Discount (%)</Text>
                <InputNumber
                  min={0}
                  max={100}
                  value={Number(formData.previousNcbDiscount || 0)}
                  onChange={(v) => setField("previousNcbDiscount", Number(v || 0))}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Hypothecation</Text>
                <Select
                  value={formData.previousHypothecation}
                  onChange={(v) => setField("previousHypothecation", v)}
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Not Applicable", value: "Not Applicable" },
                    { label: "HDFC Bank", value: "HDFC Bank" },
                    { label: "ICICI Bank", value: "ICICI Bank" },
                    { label: "SBI", value: "SBI" },
                  ]}
                />
              </Col>
              <Col xs={24}>
                <Text strong>Remarks</Text>
                <Input.TextArea
                  rows={3}
                  value={formData.previousRemarks}
                  onChange={handleChange("previousRemarks")}
                  style={{ marginTop: 6 }}
                  placeholder="Notes for previous policy..."
                />
              </Col>
            </Row>
          </Card>
        )}

        {step === 4 && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card size="small" title="Quote Builder" bordered>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Insurance Company *</Text>
                  <Input
                    value={quoteDraft.insuranceCompany}
                    onChange={(e) => setQuoteDraft((p) => ({ ...p, insuranceCompany: e.target.value }))}
                    style={{ marginTop: 6 }}
                    placeholder="Insurance Company"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Coverage Type *</Text>
                  <Select
                    value={quoteDraft.coverageType}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, coverageType: v }))}
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Comprehensive", value: "Comprehensive" },
                      { label: "Third Party", value: "Third Party" },
                      { label: "Own Damage", value: "Own Damage" },
                    ]}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>Vehicle IDV (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.vehicleIdv || 0)}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, vehicleIdv: Number(v || 0) }))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>CNG IDV (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.cngIdv || 0)}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, cngIdv: Number(v || 0) }))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>Accessories IDV (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.accessoriesIdv || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({ ...p, accessoriesIdv: Number(v || 0) }))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Policy Duration *</Text>
                  <Select
                    value={quoteDraft.policyDuration}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, policyDuration: v }))}
                    style={{ width: "100%", marginTop: 6 }}
                    options={durationOptions.map((d) => ({ label: d, value: d }))}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>NCB Discount (%)</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={Number(quoteDraft.ncbDiscount || 0)}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, ncbDiscount: Number(v || 0) }))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>OD Amount (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.odAmount || 0)}
                    onChange={(v) => setQuoteDraft((p) => ({ ...p, odAmount: Number(v || 0) }))}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>3rd Party Amount (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.thirdPartyAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({ ...p, thirdPartyAmount: Number(v || 0) }))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Text strong>Add-ons Amount (₹)</Text>
                  <InputNumber
                    min={0}
                    value={Number(quoteDraft.addOnsAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({ ...p, addOnsAmount: Number(v || 0) }))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </Col>
              </Row>

              <Divider style={{ marginBlock: 12 }} />
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Computed</Text>
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary">Total IDV: </Text>
                    <Text strong>{toINR(quoteComputed.totalIdv)}</Text>
                    <br />
                    <Text type="secondary">Total Premium: </Text>
                    <Text strong>{toINR(quoteComputed.totalPremium)}</Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Space>
                    <Button type="primary" onClick={addQuote} disabled={!quoteDraft.insuranceCompany.trim()}>
                      Add Quote
                    </Button>
                    <Button onClick={() => setQuoteDraft(initialQuoteDraft)}>Reset</Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Card
              size="small"
              title={`Generated Quotes (${quotes.length})`}
              extra={
                acceptedQuote ? (
                  <Text type="success">
                    Accepted: {acceptedQuote.insuranceCompany}
                  </Text>
                ) : (
                  <Text type="secondary">No accepted quote</Text>
                )
              }
              bordered
            >
              <Table
                size="small"
                dataSource={quoteRows}
                pagination={false}
                columns={[
                  { title: "Company", dataIndex: "insuranceCompany", key: "company" },
                  { title: "Type", dataIndex: "coverageType", key: "type", width: 140 },
                  {
                    title: "IDV",
                    key: "idv",
                    width: 150,
                    render: (_, row) => toINR(row.totalIdv || 0),
                  },
                  { title: "Duration", dataIndex: "policyDuration", key: "dur", width: 160 },
                  {
                    title: "Premium",
                    key: "prem",
                    width: 160,
                    render: (_, row) => toINR(row.totalPremium || 0),
                  },
                  {
                    title: "Accept",
                    key: "accept",
                    width: 120,
                    render: (_, row) => (
                      <Button size="small" type={acceptedQuoteId === row.id ? "primary" : "default"} onClick={() => acceptQuote(row.id)}>
                        {acceptedQuoteId === row.id ? "Accepted" : "Accept"}
                      </Button>
                    ),
                  },
                ]}
              />
              {showErrors && quotes.length === 0 ? (
                <div style={{ marginTop: 8 }}>
                  <Text type="danger">At least 1 quote is required.</Text>
                </div>
              ) : null}
            </Card>
          </Space>
        )}

        {step === 5 && (
          <Card size="small" title="New Policy Details" bordered>
            {!acceptedQuote ? (
              <Alert
                type="warning"
                showIcon
                message="No accepted quote selected yet."
                description="Please accept a quote in Step 4 to auto-fill policy details."
                style={{ marginBottom: 12 }}
              />
            ) : null}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Insurance Company *</Text>
                <Input
                  value={formData.newInsuranceCompany}
                  onChange={handleChange("newInsuranceCompany")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Type *</Text>
                <Select
                  value={formData.newPolicyType}
                  onChange={(v) => setField("newPolicyType", v)}
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Comprehensive", value: "Comprehensive" },
                    { label: "Third Party", value: "Third Party" },
                    { label: "Own Damage", value: "Own Damage" },
                  ]}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Number</Text>
                <Input
                  value={formData.newPolicyNumber}
                  onChange={handleChange("newPolicyNumber")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Issue Date *</Text>
                <Input
                  type="date"
                  value={formData.newIssueDate}
                  onChange={handleChange("newIssueDate")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Policy Start Date *</Text>
                <Input
                  type="date"
                  value={formData.newPolicyStartDate}
                  onChange={(e) =>
                    handleNewPolicyStartOrDuration({ newPolicyStartDate: e.target.value })
                  }
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Insurance Duration *</Text>
                <Select
                  value={formData.newInsuranceDuration}
                  onChange={(v) => handleNewPolicyStartOrDuration({ newInsuranceDuration: v })}
                  style={{ width: "100%", marginTop: 6 }}
                  options={durationOptions.map((d) => ({ label: d, value: d }))}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>OD Expiry Date *</Text>
                <Input
                  type="date"
                  value={formData.newOdExpiryDate}
                  onChange={handleChange("newOdExpiryDate")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>TP Expiry Date *</Text>
                <Input
                  type="date"
                  value={formData.newTpExpiryDate}
                  onChange={handleChange("newTpExpiryDate")}
                  style={{ marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>NCB Discount (%)</Text>
                <InputNumber
                  min={0}
                  max={100}
                  value={Number(formData.newNcbDiscount || 0)}
                  onChange={(v) => setField("newNcbDiscount", Number(v || 0))}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>IDV Amount (₹) *</Text>
                <InputNumber
                  min={0}
                  value={Number(formData.newIdvAmount || 0)}
                  onChange={(v) => setField("newIdvAmount", Number(v || 0))}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Total Premium (₹) *</Text>
                <InputNumber
                  min={0}
                  value={Number(formData.newTotalPremium || 0)}
                  onChange={(v) => setField("newTotalPremium", Number(v || 0))}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Hypothecation</Text>
                <Select
                  value={formData.newHypothecation}
                  onChange={(v) => setField("newHypothecation", v)}
                  style={{ width: "100%", marginTop: 6 }}
                  options={[
                    { label: "Not Applicable", value: "Not Applicable" },
                    { label: "HDFC Bank", value: "HDFC Bank" },
                    { label: "ICICI Bank", value: "ICICI Bank" },
                    { label: "SBI", value: "SBI" },
                  ]}
                />
              </Col>
              <Col xs={24}>
                <Text strong>Remarks</Text>
                <Input.TextArea
                  rows={3}
                  value={formData.newRemarks}
                  onChange={handleChange("newRemarks")}
                  style={{ marginTop: 6 }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {step === 6 && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card
              size="small"
              title="Documents"
              extra={
                <Space>
                  <Text type={allUploadedDocsTagged ? "success" : "secondary"}>
                    Tagged {docsTaggedCount}/{documents.length}
                  </Text>
                  <Button danger onClick={() => setDocuments([])} disabled={!documents.length}>
                    Clear All
                  </Button>
                </Space>
              }
              bordered
            >
              <Text type="secondary">
                Upload files and tag them (RC, Forms, PAN, Aadhaar/GST, policies, etc.).
              </Text>
              <Divider style={{ marginBlock: 12 }} />
              <Dragger
                multiple
                beforeUpload={() => false}
                showUploadList={false}
                onChange={(info) => {
                  const files = info?.fileList || [];
                  const incoming = files
                    .map((f) => f.originFileObj)
                    .filter(Boolean)
                    .map((file) => ({
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      tag: "",
                    }));
                  if (incoming.length) setDocuments((prev) => [...prev, ...incoming]);
                }}
              >
                <p className="ant-upload-drag-icon" />
                <p className="ant-upload-text">Click or drag files to upload</p>
                <p className="ant-upload-hint">Multiple files supported</p>
              </Dragger>
            </Card>

            <Card size="small" title="Uploaded Files" bordered>
              <Table
                size="small"
                dataSource={docRows}
                pagination={false}
                columns={[
                  { title: "File", dataIndex: "name", key: "name" },
                  { title: "Size (KB)", dataIndex: "sizeKb", key: "size", width: 120 },
                  {
                    title: "Tag",
                    key: "tag",
                    width: 220,
                    render: (_, row) => (
                      <Select
                        value={row.tag || undefined}
                        placeholder="Select tag"
                        style={{ width: "100%" }}
                        options={requiredDocumentTags.map((t) => ({ label: t, value: t }))}
                        onChange={(v) =>
                          setDocuments((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, tag: v } : x)),
                          )
                        }
                      />
                    ),
                  },
                ]}
              />
              {!documents.length ? (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">No documents uploaded yet.</Text>
                </div>
              ) : null}
            </Card>
          </Space>
        )}

        <Divider />
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Button onClick={step === 1 ? onCancel : goBack}>
              {step === 1 ? "Cancel" : "Previous"}
            </Button>
          </Col>
          <Col>
            <Text type="secondary">
              Step {stepIndex + 1} of {visibleSteps.length}
            </Text>
          </Col>
          <Col>
            {step < 6 ? (
              <Button type="primary" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button type="primary" htmlType="submit">
                {mode === "edit" ? "Save Changes" : "Create Case"}
              </Button>
            )}
          </Col>
        </Row>
      </form>
      </Space>
    </Card>
  );
};

export default NewInsuranceCaseForm;
