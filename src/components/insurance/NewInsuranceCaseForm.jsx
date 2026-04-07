import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

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

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-900/50";
const labelClassName =
  "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300";
const errorClassName =
  "mt-1 text-xs font-semibold text-red-600 dark:text-red-400";
const phonePrefixClassName =
  "inline-flex h-[38px] items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

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
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
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

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-sky-50/30 p-5 shadow-sm dark:border-slate-800 dark:from-black dark:to-sky-950/10 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
          {isNewCar && step === 4
            ? "Step 3: Insurance Quotes"
            : STEP_TITLES[step - 1]}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {step === 1 && "Fill personal, contact and nominee details"}
          {step === 2 && "Provide accurate vehicle information"}
          {step === 3 &&
            !isNewCar &&
            "For renewal cases & policy already expired cases"}
          {step === 4 && "Add and manage quote options"}
          {step === 5 && "Auto-filled from accepted quote"}
          {step === 6 && "Upload and manage policy documents with tagging"}
        </p>
      </div>

      {/* Step Progress Stepper */}
      <div className="mb-6">
        {/* Desktop stepper */}
        <div className="hidden items-start md:flex">
          {STEP_TITLES.filter((_, idx) => !(isNewCar && idx + 1 === 3)).map(
            (title, idx, arr) => {
              const originalIndex = STEP_TITLES.indexOf(title) + 1;
              const isActive = step === originalIndex;
              const isCompleted = step > originalIndex;
              const isLast = idx === arr.length - 1;
              const shortTitle = title.replace(/^Step\s*\d+\s*:\s*/i, "");
              return (
                <React.Fragment key={title}>
                  <button
                    type="button"
                    onClick={() => setStep(originalIndex)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                        isCompleted
                          ? "bg-sky-600 text-white"
                          : isActive
                            ? "border-2 border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                            : "border-2 border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : idx + 1}
                    </span>
                    <span
                      className={`max-w-[72px] text-center text-[10px] font-bold leading-tight transition-colors ${
                        isActive
                          ? "text-sky-700 dark:text-sky-300"
                          : isCompleted
                            ? "text-slate-600 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {shortTitle}
                    </span>
                  </button>
                  {!isLast && (
                    <div
                      className={`mx-1 mt-3.5 h-0.5 flex-1 transition-all ${
                        isCompleted
                          ? "bg-sky-500"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            },
          )}
        </div>

        {/* Mobile: pill progress + step label */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex gap-1">
            {STEP_TITLES.filter((_, idx) => !(isNewCar && idx + 1 === 3)).map(
              (title, idx) => {
                const originalIndex = STEP_TITLES.indexOf(title) + 1;
                const isActive = step === originalIndex;
                const isCompleted = step > originalIndex;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setStep(originalIndex)}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? "w-6 bg-sky-600"
                        : isCompleted
                          ? "w-2 bg-sky-400"
                          : "w-2 bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                );
              },
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isNewCar && step === 4
              ? "Step 3: Insurance Quotes"
              : STEP_TITLES[step - 1]}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitFinal} className="space-y-4">
        {step === 1 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Buyer Type *</label>
                <div className="flex gap-2">
                  {["Individual", "Company"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, buyerType: type }))
                      }
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        formData.buyerType === type
                          ? "border-sky-600 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClassName}>Vehicle Type *</label>
                <div className="flex gap-2">
                  {["New Car", "Used Car"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, vehicleType: type }))
                      }
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        formData.vehicleType === type
                          ? "border-sky-600 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClassName}>Policy Done By *</label>
                <input
                  value={formData.policyDoneBy}
                  onChange={handleChange("policyDoneBy")}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Broker Name</label>
                <input
                  value={formData.brokerName}
                  onChange={handleChange("brokerName")}
                  className={inputClassName}
                  placeholder="Select Broker first"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClassName}>Source Origin</label>
                <input
                  value={formData.sourceOrigin}
                  onChange={handleChange("sourceOrigin")}
                  className={inputClassName}
                  placeholder="Select or type agent name"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  From where we got the policy client
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Employee Name *</label>
                <input
                  value={formData.employeeName}
                  onChange={handleChange("employeeName")}
                  className={inputClassName}
                  placeholder="Enter employee name"
                />
                {showErrors && step1Errors.employeeName ? (
                  <p className={errorClassName}>{step1Errors.employeeName}</p>
                ) : null}
              </div>
              {isCompany ? (
                <>
                  <div>
                    <label className={labelClassName}>Company Name *</label>
                    <input
                      value={formData.companyName}
                      onChange={handleChange("companyName")}
                      className={inputClassName}
                      placeholder="Enter company name"
                    />
                    {showErrors && step1Errors.companyName ? (
                      <p className={errorClassName}>
                        {step1Errors.companyName}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClassName}>
                      Contact Person Name *
                    </label>
                    <input
                      value={formData.contactPersonName}
                      onChange={handleChange("contactPersonName")}
                      className={inputClassName}
                      placeholder="Enter contact person name"
                    />
                    {showErrors && step1Errors.contactPersonName ? (
                      <p className={errorClassName}>
                        {step1Errors.contactPersonName}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelClassName}>Customer Name *</label>
                  <input
                    value={formData.customerName}
                    onChange={handleChange("customerName")}
                    className={inputClassName}
                    placeholder="Enter customer name"
                  />
                  {showErrors && step1Errors.customerName ? (
                    <p className={errorClassName}>{step1Errors.customerName}</p>
                  ) : null}
                </div>
              )}
              <div>
                <label className={labelClassName}>Mobile Number *</label>
                <div className="flex">
                  <span className={phonePrefixClassName}>+91</span>
                  <input
                    value={formData.mobile}
                    onChange={handleChange("mobile")}
                    className={`${inputClassName} rounded-l-none`}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                  />
                </div>
                {showErrors && step1Errors.mobile ? (
                  <p className={errorClassName}>{step1Errors.mobile}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Alternate Phone Number</label>
                <div className="flex">
                  <span className={phonePrefixClassName}>+91</span>
                  <input
                    value={formData.alternatePhone}
                    onChange={handleChange("alternatePhone")}
                    className={`${inputClassName} rounded-l-none`}
                    placeholder="Enter alternate number"
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Email Address *</label>
                <input
                  value={formData.email}
                  onChange={handleChange("email")}
                  className={inputClassName}
                  placeholder={
                    isCompany
                      ? "Enter company email address"
                      : "Enter email address"
                  }
                />
                {showErrors && step1Errors.email ? (
                  <p className={errorClassName}>{step1Errors.email}</p>
                ) : null}
              </div>
              {!isCompany ? (
                <div>
                  <label className={labelClassName}>Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={handleChange("gender")}
                    className={inputClassName}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              ) : null}
              <div>
                <label className={labelClassName}>
                  PAN Number {isCompany ? "*" : ""}
                </label>
                <input
                  value={formData.panNumber}
                  onChange={handleChange("panNumber")}
                  className={inputClassName}
                  placeholder="ABCDE1234F"
                />
                {showErrors && step1Errors.panNumber ? (
                  <p className={errorClassName}>{step1Errors.panNumber}</p>
                ) : null}
              </div>
              {isCompany ? (
                <div>
                  <label className={labelClassName}>GST Number</label>
                  <input
                    value={formData.gstNumber}
                    onChange={handleChange("gstNumber")}
                    className={inputClassName}
                    placeholder="Enter GST number"
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClassName}>Aadhaar Number</label>
                  <input
                    value={formData.aadhaarNumber}
                    onChange={handleChange("aadhaarNumber")}
                    className={inputClassName}
                    placeholder="1234 5678 9012"
                  />
                </div>
              )}
              <div>
                <label className={labelClassName}>
                  {isCompany ? "Office Address *" : "Residence Address *"}
                </label>
                <textarea
                  rows={2}
                  value={formData.residenceAddress}
                  onChange={handleChange("residenceAddress")}
                  className={inputClassName}
                  placeholder="Enter complete address"
                />
                {showErrors && step1Errors.residenceAddress ? (
                  <p className={errorClassName}>
                    {step1Errors.residenceAddress}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Pincode *</label>
                <input
                  value={formData.pincode}
                  onChange={handleChange("pincode")}
                  className={inputClassName}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                />
                {showErrors && step1Errors.pincode ? (
                  <p className={errorClassName}>{step1Errors.pincode}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>City *</label>
                <input
                  value={formData.city}
                  onChange={handleChange("city")}
                  className={inputClassName}
                  placeholder="Enter city"
                />
                {showErrors && step1Errors.city ? (
                  <p className={errorClassName}>{step1Errors.city}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
                Nominee Information (Optional)
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <input
                  value={formData.nomineeName}
                  onChange={handleChange("nomineeName")}
                  className={inputClassName}
                  placeholder="Nominee Name"
                />
                <input
                  value={formData.nomineeRelationship}
                  onChange={handleChange("nomineeRelationship")}
                  className={inputClassName}
                  placeholder="Type relationship"
                />
                <input
                  value={formData.nomineeAge}
                  onChange={handleChange("nomineeAge")}
                  className={inputClassName}
                  placeholder="Nominee Age"
                />
              </div>
            </div>

            <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/10">
              <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
                Reference Information (Optional)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={formData.referenceName}
                  onChange={handleChange("referenceName")}
                  className={inputClassName}
                  placeholder="Reference Name"
                />
                <input
                  value={formData.referencePhone}
                  onChange={handleChange("referencePhone")}
                  className={inputClassName}
                  placeholder="Reference Phone Number"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Registration Number *</label>
                <input
                  value={formData.registrationNumber}
                  onChange={handleChange("registrationNumber")}
                  className={inputClassName}
                  placeholder="Enter Vehicle Number"
                />
                {showErrors && step2Errors.registrationNumber ? (
                  <p className={errorClassName}>
                    {step2Errors.registrationNumber}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Vehicle Make *</label>
                <input
                  value={formData.vehicleMake}
                  onChange={handleChange("vehicleMake")}
                  className={inputClassName}
                  placeholder="Type vehicle make"
                />
                {showErrors && step2Errors.vehicleMake ? (
                  <p className={errorClassName}>{step2Errors.vehicleMake}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Vehicle Model *</label>
                <input
                  value={formData.vehicleModel}
                  onChange={handleChange("vehicleModel")}
                  className={inputClassName}
                  placeholder="Select make first"
                  disabled={!formData.vehicleMake}
                />
                {!formData.vehicleMake ? (
                  <p className="mt-1 text-xs text-amber-600">
                    Please select vehicle make first
                  </p>
                ) : null}
                {showErrors && step2Errors.vehicleModel ? (
                  <p className={errorClassName}>{step2Errors.vehicleModel}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Vehicle Variant *</label>
                <input
                  value={formData.vehicleVariant}
                  onChange={handleChange("vehicleVariant")}
                  className={inputClassName}
                  placeholder="Select make and model first"
                  disabled={!formData.vehicleMake || !formData.vehicleModel}
                />
                {!formData.vehicleMake ? (
                  <p className="mt-1 text-xs text-amber-600">
                    Select make first
                  </p>
                ) : null}
                {showErrors && step2Errors.vehicleVariant ? (
                  <p className={errorClassName}>{step2Errors.vehicleVariant}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Cubic Capacity (cc)</label>
                <input
                  value={formData.cubicCapacity}
                  onChange={handleChange("cubicCapacity")}
                  className={inputClassName}
                  placeholder="Enter cubic capacity"
                />
              </div>
              <div>
                <label className={labelClassName}>Engine Number *</label>
                <input
                  value={formData.engineNumber}
                  onChange={handleChange("engineNumber")}
                  className={inputClassName}
                  placeholder="Enter engine number"
                />
                {showErrors && step2Errors.engineNumber ? (
                  <p className={errorClassName}>{step2Errors.engineNumber}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Chassis Number *</label>
                <input
                  value={formData.chassisNumber}
                  onChange={handleChange("chassisNumber")}
                  className={inputClassName}
                  placeholder="Enter chassis number"
                />
                {showErrors && step2Errors.chassisNumber ? (
                  <p className={errorClassName}>{step2Errors.chassisNumber}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClassName}>Types of Vehicle</label>
                <select
                  value={formData.typesOfVehicle}
                  onChange={handleChange("typesOfVehicle")}
                  className={inputClassName}
                >
                  <option>Four Wheeler</option>
                </select>
              </div>
              <div>
                <label className={labelClassName}>Manufacture Date *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={formData.manufactureMonth}
                    onChange={handleChange("manufactureMonth")}
                    className={inputClassName}
                    placeholder="Month"
                  />
                  <input
                    value={formData.manufactureYear}
                    onChange={handleChange("manufactureYear")}
                    className={inputClassName}
                    placeholder="Year"
                  />
                </div>
                {showErrors && step2Errors.manufactureMonth ? (
                  <p className={errorClassName}>
                    {step2Errors.manufactureMonth}
                  </p>
                ) : null}
                {showErrors && step2Errors.manufactureYear ? (
                  <p className={errorClassName}>
                    {step2Errors.manufactureYear}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
              Note: All vehicle details must be accurate as they will be
              verified during policy issuance. You can start typing the
              registration number to auto-fill details from existing records.
            </p>
          </>
        )}

        {step === 3 && !isNewCar && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
              <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
                Previous Policy Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Insurance Company</label>
                  <input
                    value={formData.previousInsuranceCompany}
                    onChange={handleChange("previousInsuranceCompany")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Policy Number</label>
                  <input
                    value={formData.previousPolicyNumber}
                    onChange={handleChange("previousPolicyNumber")}
                    className={inputClassName}
                    placeholder="OG-25-1102-1801-00004082"
                  />
                </div>
                <div>
                  <label className={labelClassName}>Policy Type</label>
                  <select
                    value={formData.previousPolicyType}
                    onChange={handleChange("previousPolicyType")}
                    className={inputClassName}
                  >
                    <option>Comprehensive</option>
                    <option>Third Party</option>
                    <option>Own Damage</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Policy Start Date</label>
                  <input
                    type="date"
                    value={formData.previousPolicyStartDate}
                    onChange={(e) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyStartDate: e.target.value,
                      })
                    }
                    className={inputClassName}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Policy coverage start date
                  </p>
                </div>
                <div>
                  <label className={labelClassName}>Policy Duration</label>
                  <select
                    value={formData.previousPolicyDuration}
                    onChange={(e) =>
                      handlePreviousPolicyStartOrDuration({
                        previousPolicyDuration: e.target.value,
                      })
                    }
                    className={inputClassName}
                  >
                    {durationOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Available: {durationOptions.join(", ")}
                  </p>
                </div>
                <div>
                  <label className={labelClassName}>OD Expiry Date</label>
                  <input
                    type="date"
                    value={formData.previousOdExpiryDate}
                    onChange={handleChange("previousOdExpiryDate")}
                    className={inputClassName}
                  />
                  <p className="mt-1 text-xs text-emerald-600">
                    Auto-calculated ✓ You can edit if needed
                  </p>
                </div>
                <div>
                  <label className={labelClassName}>TP Expiry Date</label>
                  <input
                    type="date"
                    value={formData.previousTpExpiryDate}
                    onChange={handleChange("previousTpExpiryDate")}
                    className={inputClassName}
                  />
                  <p className="mt-1 text-xs text-emerald-600">
                    Auto-calculated ✓ You can edit if needed
                  </p>
                </div>
                <div>
                  <label className={labelClassName}>
                    Claim Taken Last Year
                  </label>
                  <div className="flex gap-2">
                    {["Yes", "No"].map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            claimTakenLastYear: x,
                          }))
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${formData.claimTakenLastYear === x ? "border-sky-600 bg-sky-50 text-sky-700" : "border-slate-300"}`}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>NCB Discount (%)</label>
                  <input
                    type="number"
                    value={formData.previousNcbDiscount}
                    onChange={handleChange("previousNcbDiscount")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Hypothecation</label>
                  <select
                    value={formData.previousHypothecation}
                    onChange={handleChange("previousHypothecation")}
                    className={inputClassName}
                  >
                    <option>Not Applicable</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>SBI</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Select the bank if vehicle is financed, otherwise select
                    "Not Applicable"
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClassName}>Remarks</label>
                  <textarea
                    rows={3}
                    value={formData.previousRemarks}
                    onChange={handleChange("previousRemarks")}
                    className={inputClassName}
                    placeholder="Enter any remarks or notes for the previous policy..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${acceptedQuote ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"}`}
            >
              <p
                className={`text-sm font-semibold ${acceptedQuote ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
              >
                Quotes: {quotes.length} | Required: At least 1{" "}
                {acceptedQuote
                  ? `| ✅ ${acceptedQuote.insuranceCompany} Accepted`
                  : ""}
              </p>
            </div>

            <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/40 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/10">
              <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
                Add New Quote
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Insurance Company *</label>
                  <input
                    value={quoteDraft.insuranceCompany}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        insuranceCompany: e.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="Insurance Company"
                  />
                </div>
                <div>
                  <label className={labelClassName}>Coverage Type *</label>
                  <select
                    value={quoteDraft.coverageType}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        coverageType: e.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option>Comprehensive</option>
                    <option>Third Party</option>
                    <option>Own Damage</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Vehicle IDV (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.vehicleIdv}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        vehicleIdv: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>CNG IDV (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.cngIdv}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        cngIdv: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Accessories IDV (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.accessoriesIdv}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        accessoriesIdv: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Total IDV (₹) *</label>
                  <input
                    readOnly
                    value={quoteComputed.totalIdv}
                    className={`${inputClassName} bg-slate-50 dark:bg-slate-900`}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Policy Duration *</label>
                  <select
                    value={quoteDraft.policyDuration}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        policyDuration: e.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    {durationOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>NCB Discount (%)</label>
                  <input
                    type="number"
                    value={quoteDraft.ncbDiscount}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        ncbDiscount: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>OD Amount (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.odAmount}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        odAmount: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>3rd Party Amount (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.thirdPartyAmount}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        thirdPartyAmount: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Add Ons (₹)</label>
                  <input
                    type="number"
                    value={quoteDraft.addOnsAmount}
                    onChange={(e) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        addOnsAmount: Number(e.target.value || 0),
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/10">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">
                    Additional Add-ons (Optional)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        setQuoteDraft((p) => ({
                          ...p,
                          addOns: Object.fromEntries(
                            addOnCatalog.map((name) => [name, 0]),
                          ),
                        }))
                      }
                    >
                      Select All (₹0)
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        setQuoteDraft((p) => ({
                          ...p,
                          addOns: Object.fromEntries(
                            addOnCatalog.map((name) => [name, 0]),
                          ),
                        }))
                      }
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {addOnCatalog.map((name) => (
                    <div
                      key={name}
                      className="rounded border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <p className="text-sm font-semibold">{name}</p>
                      <label className="mt-1 block text-xs text-slate-500">
                        Amount:
                      </label>
                      <input
                        type="number"
                        className={inputClassName}
                        value={quoteDraft.addOns[name]}
                        onChange={(e) =>
                          setQuoteDraft((p) => ({
                            ...p,
                            addOns: {
                              ...p.addOns,
                              [name]: Number(e.target.value || 0),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl border border-teal-200/80 bg-teal-50/40 p-3 text-sm dark:border-teal-900/40 dark:bg-teal-950/10 md:grid-cols-2">
                <div>
                  <p className="font-semibold">
                    Base Premium: {toINR(quoteComputed.basePremium)}
                  </p>
                  <p className="text-xs text-slate-500">
                    OD: {toINR(quoteDraft.odAmount)} + 3P:{" "}
                    {toINR(quoteDraft.thirdPartyAmount)} + Add-ons:{" "}
                    {toINR(quoteComputed.addOnsTotal)}
                  </p>
                  <p className="mt-1">
                    NCB Discount: -{toINR(quoteComputed.ncbAmount)}
                  </p>
                  <p>GST (18%): {toINR(quoteComputed.gstAmount)}</p>
                  <p className="font-bold">
                    Total Premium: {toINR(quoteComputed.totalPremium)}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">IDV Breakdown</p>
                  <p className="text-xs">
                    Vehicle IDV: {toINR(quoteDraft.vehicleIdv)}
                  </p>
                  <p className="text-xs">CNG IDV: {toINR(quoteDraft.cngIdv)}</p>
                  <p className="text-xs">
                    Accessories IDV: {toINR(quoteDraft.accessoriesIdv)}
                  </p>
                  <p className="text-xs">
                    Total IDV: {toINR(quoteComputed.totalIdv)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addQuote}
                className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                Add Quote
              </button>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black">
                  Generated Quotes ({quotes.length}) • {acceptedQuote ? 1 : 0}{" "}
                  Accepted
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setSelectedQuoteIds(quotes.map((q) => q.id))}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setSelectedQuoteIds([])}
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Download Selected ({selectedQuoteIds.length})
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">{q.insuranceCompany}</p>
                        <p className="text-xs text-slate-500">
                          IDV: {toINR(q.totalIdv)} • {q.policyDuration} • NCB:{" "}
                          {q.ncbDiscount}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {acceptedQuoteId === q.id ? (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            ACCEPTED
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => acceptQuote(q.id)}
                        >
                          Accept
                        </button>
                        <input
                          type="checkbox"
                          checked={selectedQuoteIds.includes(q.id)}
                          onChange={(e) =>
                            setSelectedQuoteIds((prev) =>
                              e.target.checked
                                ? [...prev, q.id]
                                : prev.filter((id) => id !== q.id),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {showErrors && quotes.length === 0 ? (
                <p className={errorClassName}>At least 1 quote is required</p>
              ) : null}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 text-sm ${acceptedQuote ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"}`}
            >
              {acceptedQuote ? (
                <p>
                  Auto-filled from accepted quote:{" "}
                  <span className="font-bold">
                    {acceptedQuote.insuranceCompany}
                  </span>{" "}
                  (Quote ID: {acceptedQuote.id})
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-300">
                  No accepted quote selected yet. Please accept one quote in
                  Step 4.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-sky-200/80 bg-sky-50/30 p-4 dark:border-sky-900/40 dark:bg-sky-950/10">
              <h3 className="mb-3 text-sm font-black">
                Policy Information (Auto-filled from current accepted quote)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Insurance Company *</label>
                  <input
                    value={formData.newInsuranceCompany}
                    onChange={handleChange("newInsuranceCompany")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Policy Type *</label>
                  <select
                    value={formData.newPolicyType}
                    onChange={handleChange("newPolicyType")}
                    className={inputClassName}
                  >
                    <option>Comprehensive</option>
                    <option>Third Party</option>
                    <option>Own Damage</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Policy Number</label>
                  <input
                    value={formData.newPolicyNumber}
                    onChange={handleChange("newPolicyNumber")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Issue Date *</label>
                  <input
                    type="date"
                    value={formData.newIssueDate}
                    onChange={handleChange("newIssueDate")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Policy Start Date *</label>
                  <input
                    type="date"
                    value={formData.newPolicyStartDate}
                    onChange={(e) =>
                      handleNewPolicyStartOrDuration({
                        newPolicyStartDate: e.target.value,
                      })
                    }
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Insurance Duration *</label>
                  <select
                    value={formData.newInsuranceDuration}
                    onChange={(e) =>
                      handleNewPolicyStartOrDuration({
                        newInsuranceDuration: e.target.value,
                      })
                    }
                    className={inputClassName}
                  >
                    {durationOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>OD Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.newOdExpiryDate}
                    onChange={handleChange("newOdExpiryDate")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>TP Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.newTpExpiryDate}
                    onChange={handleChange("newTpExpiryDate")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>NCB Discount (%)</label>
                  <input
                    type="number"
                    value={formData.newNcbDiscount}
                    onChange={handleChange("newNcbDiscount")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>IDV Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.newIdvAmount}
                    onChange={handleChange("newIdvAmount")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Total Premium (₹) *</label>
                  <input
                    type="number"
                    value={formData.newTotalPremium}
                    onChange={handleChange("newTotalPremium")}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Hypothecation</label>
                  <select
                    value={formData.newHypothecation}
                    onChange={handleChange("newHypothecation")}
                    className={inputClassName}
                  >
                    <option>Not Applicable</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>SBI</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClassName}>Remarks</label>
                  <textarea
                    rows={3}
                    value={formData.newRemarks}
                    onChange={handleChange("newRemarks")}
                    className={inputClassName}
                    placeholder="Enter any remarks or notes for the new policy..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/40 dark:bg-violet-950/10">
              <h3 className="text-sm font-black">Document Requirements</h3>
              <button
                type="button"
                onClick={() => setDocuments([])}
                className="rounded border px-2 py-1 text-xs"
              >
                Clear All
              </button>
            </div>

            <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/40 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/10">
              <p className="mb-2 text-sm font-semibold">Documents</p>
              <div className="flex flex-wrap gap-2">
                {requiredDocumentTags.map((doc) => (
                  <span
                    key={doc}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-900"
                  >
                    {doc}
                  </span>
                ))}
              </div>
              <p
                className={`mt-3 text-xs font-semibold ${allUploadedDocsTagged ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}
              >
                Documents Status: Total Documents: {documents.length} | Tagged:{" "}
                {docsTaggedCount}
                {allUploadedDocsTagged ? " | ✅ Documents Ready" : ""}
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <p className="text-sm font-semibold">Drag and drop files here</p>
              <p className="mt-1 text-xs text-slate-500">
                or click to browse your files (Multiple files supported)
              </p>
              <input
                type="file"
                multiple
                className="mt-3"
                onChange={(e) => handleFilesUpload(e.target.files)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Supported: PDF, JPG, PNG, GIF, WEBP, BMP, DOC, DOCX, XLS, XLSX,
                TXT • Max file size: 10MB each
              </p>
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-3 dark:border-slate-700"
                >
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {Math.round((doc.size || 0) / 1024)} KB
                    </p>
                  </div>
                  <select
                    className={inputClassName}
                    value={doc.tag}
                    onChange={(e) =>
                      setDocuments((prev) =>
                        prev.map((x) =>
                          x.id === doc.id ? { ...x, tag: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="">Tag document</option>
                    {requiredDocumentTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={step === 1 ? onCancel : goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {step === 1 ? "Cancel" : "← Previous"}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            Step {STEP_TITLES.filter((_, idx) => !(isNewCar && idx + 1 === 3)).findIndex((t) => STEP_TITLES.indexOf(t) + 1 === step) + 1} of{" "}
            {STEP_TITLES.filter((_, idx) => !(isNewCar && idx + 1 === 3)).length}
          </div>

          {step < 6 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-95"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <Check size={15} strokeWidth={3} />
              {mode === "edit" ? "Save Changes" : "Create Case"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

export default NewInsuranceCaseForm;
