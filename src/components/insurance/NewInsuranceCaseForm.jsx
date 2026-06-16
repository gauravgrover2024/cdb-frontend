import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import { CheckCircleFilled, UnorderedListOutlined } from "@ant-design/icons";
import { insuranceApi } from "../../api/insurance";
import { customersApi } from "../../api/customers";
import { vehiclesApi } from "../../api/vehicles";
import { featuresApi } from "../../api/features";
import { loansApi } from "../../api/loans";
import { getEmployees } from "../../api/employees";
import Step1CustomerInfo from "./steps/Step1CustomerInfo";
import Step2VehicleDetails from "./steps/Step2VehicleDetails";
import Step3PreviousPolicy from "./steps/Step3PreviousPolicy";
import Step4InsuranceQuotes from "./steps/Step4InsuranceQuotes";
import Step6NewPolicyDetails from "./steps/Step5NewPolicyDetails";
import Step7Documents from "./steps/Step6Documents";
import Step8Payment from "./steps/Step7Payment";
import Step9Payout from "./steps/Step8Payout";
import { STEP_TITLES, durationOptions, addOnCatalog } from "./steps/allSteps";
import {
  DEFAULT_PAYOUT_PERCENTAGE,
  computePayoutBaseAmount,
} from "./steps/payoutRates";
import InsuranceStickyHeader from "./InsuranceStickyHeader";
import InsuranceStageFooter from "./InsuranceStageFooter";
import "./insurance-header-pills.css";
import "./insurance-forms.css";
import InsuranceAntdProvider from "./InsuranceAntdProvider";
import {
  lookupCityByPincode,
  normalizePincode,
} from "../../modules/loans/components/loan-form/pre-file/pincodeCityLookup";
import { usePreventPageRefresh } from "../../utils/formDataProtection";
import UnsavedChangesModal from "../ui/UnsavedChangesModal";
import {
  collectLinkedDocumentsForInsurance,
  mergeLinkedIntoExistingDocuments,
} from "../../utils/insuranceLinkedDocuments";
import { useLocation, useNavigate } from "react-router-dom";
import {
  digits10,
  mergeInsuranceCustomerFields,
  mergeInsuranceReferenceFields,
  normalizeCustomerSearchPayload,
  mapCustomerToInsuranceFields,
} from "../../utils/customerFormMapping";

const { Text, Title } = Typography;

const initialFormState = {
  buyerType: "Individual",
  vehicleType: "New Car",
  policyCategory: "Insurance Policy",
  policyDoneBy: "Autocredits India LLP",
  brokerName: "",
  showroomName: "",
  employeeName: "",
  employeeUserId: "",
  source: "Direct",
  sourceName: "",
  usedCarFlowType: "Renewal",
  policyJourneyClassification: "",
  dealerChannelName: "",
  channelDealerNo: "",
  dealerChannelAddress: "",
  dealerMobile: "",
  payoutApplicable: "No",
  payoutPercent: "",
  assignedTo: "",
  sourceOrigin: "Direct",

  customerId: "",
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
  nomineeDob: "",
  nomineeAge: "",
  referenceName: "",
  referencePhone: "",

  registrationNumber: "",
  registrationAllotted: "Yes",
  vehicleMake: "",
  vehicleModel: "",
  vehicleVariant: "",
  cubicCapacity: "",
  engineNumber: "",
  chassisNumber: "",
  typesOfVehicle: "Four Wheeler",
  manufactureMonth: "",
  manufactureYear: "",
  manufactureDate: "",
  regAuthority: "",
  dateOfReg: "",
  fuelType: "",
  batteryNumber: "",
  chargerNumber: "",
  hypothecation: "Not applicable",

  previousInsuranceCompany: "",
  previousPolicyNumber: "",
  previousPolicyType: "",
  previousPolicyStartDate: "",
  previousPolicyDuration: "",
  previousOdExpiryDate: "",
  previousTpExpiryDate: "",
  claimTakenLastYear: "",
  previousNcbDiscount: 0,
  previousIdvAmount: 0,
  previousOwnDamageAmount: 0,
  previousBasicOwnDamageAmount: 0,
  previousThirdPartyAmount: 0,
  previousBasicThirdPartyAmount: 0,
  previousAddOnsTotal: 0,
  previousTotalPremium: 0,
  previousSelectedAddOns: [],
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
  newVehicleIdv: 0,
  newCngIdv: 0,
  newAccessoriesIdv: 0,
  newTotalPremium: 0,
  payoutPercentage: 10,
  subventionAmount: 0,
  subventionEntries: [],
  newHypothecation: "Not Applicable",
  newRemarks: "",

  // New fields for upgrade
  exShowroomPrice: 0,
  dateOfSale: "",
  dateOfPurchase: "",
  odometerReading: 0,
  policyPurchaseDate: "",

  // Extended Warranty
  ewCommencementDate: "",
  ewExpiryDate: "",
  kmsCoverage: "",

  // Payout Details
  insurance_receivables: [],
  insurance_payables: [],

  customerPaymentExpected: 0,
  customerPaymentReceived: 0,
  inhousePaymentExpected: 0,
  inhousePaymentReceived: 0,
};

const initialQuoteDraft = {
  insuranceCompany: "",
  coverageType: "Comprehensive",
  hypothecation: "Not Applicable",
  vehicleIdv: 0,
  cngIdv: 0,
  accessoriesIdv: 0,
  policyDuration: "1yr OD + 1yr TP",
  ncbDiscount: 0,
  payoutPercentage: 10,
  odAmount: 0,
  thirdPartyAmount: 0,
  addOnsAmount: 0,
  addOns: addOnCatalog.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
  /** Per catalog add-on: when true, amount counts (₹0 still counts as included). */
  addOnsIncluded: addOnCatalog.reduce(
    (acc, name) => ({ ...acc, [name]: false }),
    {},
  ),
};

const INSURANCE_DRAFT_STORAGE_KEY = "insurance_case_draft";

const saveInsuranceDraftToSession = (draft) => {
  if (typeof window === "undefined" || !window?.sessionStorage) return false;
  try {
    window.sessionStorage.setItem(
      INSURANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({ timestamp: new Date().toISOString(), draft }),
    );
    return true;
  } catch (err) {
    console.error("[Insurance] Failed to save draft to sessionStorage:", err);
    return false;
  }
};

const loadInsuranceDraftFromSession = () => {
  if (typeof window === "undefined" || !window?.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(INSURANCE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.draft || null;
  } catch (err) {
    console.error(
      "[Insurance] Failed to parse draft from sessionStorage:",
      err,
    );
    return null;
  }
};

const clearInsuranceDraftFromSession = () => {
  if (typeof window === "undefined" || !window?.sessionStorage) return false;
  try {
    window.sessionStorage.removeItem(INSURANCE_DRAFT_STORAGE_KEY);
    return true;
  } catch (err) {
    console.error(
      "[Insurance] Failed to clear draft from sessionStorage:",
      err,
    );
    return false;
  }
};

const STEP4_NCB_STEPPING = {
  0: 20,
  20: 25,
  25: 35,
  35: 45,
  45: 50,
  50: 50,
};

const normalizeNcbStepValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n >= 50) return 50;
  if (n >= 45) return 45;
  if (n >= 35) return 35;
  if (n >= 25) return 25;
  if (n >= 20) return 20;
  return 0;
};

const getSuggestedStep4Ncb = ({
  previousNcbDiscount = 0,
  claimTakenLastYear = "",
} = {}) => {
  if (String(claimTakenLastYear || "").trim() === "Yes") return 0;
  const normalizedPrevious = normalizeNcbStepValue(previousNcbDiscount);
  return STEP4_NCB_STEPPING[normalizedPrevious] ?? 0;
};

const getStep4DurationOptions = ({
  coverageType = "Comprehensive",
  isNewCar,
}) => {
  if (coverageType === "Comprehensive") {
    return isNewCar
      ? ["1yr OD + 3yr TP", "2yr OD + 3yr TP", "3yr OD + 3yr TP"]
      : ["1yr OD + 1yr TP"];
  }
  if (coverageType === "Third Party") return ["1 Year", "2 Years", "3 Years"];
  return ["1 Year", "2 Years", "3 Years"];
};

const getDefaultStep4PolicyDuration = ({
  coverageType = "Comprehensive",
  isNewCar,
}) => getStep4DurationOptions({ coverageType, isNewCar })[0] || "";

const normalizePolicyTypeLabel = (value) => {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return "";
  if (lower === "own damage" || lower === "od" || lower === "sod")
    return "Stand Alone OD";
  if (lower === "tp" || lower.includes("third party")) return "Third Party";
  if (lower.includes("comprehensive")) return "Comprehensive";
  return raw;
};

const isValidMongoObjectId = (value) =>
  /^[a-f\d]{24}$/i.test(String(value || "").trim());

const normalizePaymentHistoryForPersist = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row = {}) => {
    const normalized = { ...row };
    const rowId = String(row?._id || "").trim();
    if (!isValidMongoObjectId(rowId)) delete normalized._id;
    return normalized;
  });

const buildQuoteSignature = (quote = {}) => {
  const normalizedCompany = String(quote.insuranceCompany || "")
    .trim()
    .toLowerCase();
  const normalizedCoverageRaw = String(quote.coverageType || "").trim();
  const normalizedCoverage =
    normalizedCoverageRaw === "Own Damage"
      ? "Stand Alone OD"
      : normalizedCoverageRaw;
  const normalizedDuration = String(quote.policyDuration || "").trim();
  const included =
    quote.addOnsIncluded && typeof quote.addOnsIncluded === "object"
      ? quote.addOnsIncluded
      : {};
  const addOns =
    quote.addOns && typeof quote.addOns === "object" ? quote.addOns : {};
  const addOnSignature = addOnCatalog
    .map((name) => {
      const isIncluded = included[name] ? 1 : 0;
      const amount = Number(addOns[name] || 0);
      return `${name}:${isIncluded}:${amount}`;
    })
    .join("|");

  return JSON.stringify({
    insuranceCompany: normalizedCompany,
    coverageType: normalizedCoverage,
    hypothecation: String(quote.hypothecation || "").trim(),
    policyDuration: normalizedDuration,
    vehicleIdv: Number(quote.vehicleIdv || 0),
    cngIdv: Number(quote.cngIdv || 0),
    accessoriesIdv: Number(quote.accessoriesIdv || 0),
    ncbDiscount: Number(quote.ncbDiscount || 0),
    odAmount: Number(quote.odAmount || 0),
    thirdPartyAmount: Number(quote.thirdPartyAmount || 0),
    addOnsAmount: Number(quote.addOnsAmount || 0),
    addOns: addOnSignature,
  });
};

/** Stable id for quote rows (saved cases may only have _id). */
const getQuoteRowId = (q, index = 0) =>
  q?.id ?? q?._id ?? q?.quoteId ?? `quote-${index}`;

/**
 * Map a persisted quote row into the Step-4 "Add quote" draft so saved data
 * shows in the builder (not only in the table).
 * @param {Record<string, unknown>} q
 * @returns {typeof initialQuoteDraft}
 */
const mapQuoteToDraft = (q) => {
  if (!q || typeof q !== "object") {
    return {
      ...initialQuoteDraft,
      addOns: { ...initialQuoteDraft.addOns },
      addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
    };
  }
  const baseAddOns = addOnCatalog.reduce(
    (acc, name) => ({ ...acc, [name]: 0 }),
    {},
  );
  const incoming =
    q.addOns && typeof q.addOns === "object" && !Array.isArray(q.addOns)
      ? q.addOns
      : {};
  const mergedAddOns = { ...baseAddOns };
  Object.keys(incoming).forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(mergedAddOns, k)) {
      mergedAddOns[k] = Number(incoming[k]) || 0;
    }
  });

  const incomingInc =
    q.addOnsIncluded &&
    typeof q.addOnsIncluded === "object" &&
    !Array.isArray(q.addOnsIncluded)
      ? q.addOnsIncluded
      : {};
  const mergedIncluded = addOnCatalog.reduce((acc, name) => {
    if (typeof incomingInc[name] === "boolean") {
      acc[name] = incomingInc[name];
    } else {
      acc[name] = Number(mergedAddOns[name]) > 0;
    }
    return acc;
  }, {});

  let vehicleIdv = Number(q.vehicleIdv) || 0;
  let cngIdv = Number(q.cngIdv) || 0;
  let accessoriesIdv = Number(q.accessoriesIdv) || 0;
  const sumParts = vehicleIdv + cngIdv + accessoriesIdv;
  const totalIdvStored = Number(q.totalIdv) || 0;
  if (sumParts === 0 && totalIdvStored > 0) {
    vehicleIdv = totalIdvStored;
  }
  const normalizedNcbDiscount = Number(
    q.ncbDiscount ?? q.newNcbDiscount ?? q.ncb_percentage ?? 0,
  );
  const normalizedOdAmount = Number(
    q.odAmount ?? q.ownDamage ?? q.basicOwnDamage ?? q.odPremium ?? 0,
  );
  const normalizedTpAmount = Number(
    q.thirdPartyAmount ?? q.thirdParty ?? q.basicThirdParty ?? q.tpPremium ?? 0,
  );

  const normalizedCoverage = String(q.coverageType || "Comprehensive").trim();
  const coverageType =
    normalizedCoverage === "Own Damage" ? "Stand Alone OD" : normalizedCoverage;

  return {
    insuranceCompany: String(q.insuranceCompany ?? "").trim(),
    coverageType,
    hypothecation: String(
      q.hypothecation || initialQuoteDraft.hypothecation || "Not Applicable",
    ),
    vehicleIdv,
    cngIdv,
    accessoriesIdv,
    policyDuration: String(
      q.policyDuration || initialQuoteDraft.policyDuration,
    ),
    ncbDiscount: normalizedNcbDiscount || 0,
    odAmount: normalizedOdAmount || 0,
    thirdPartyAmount: normalizedTpAmount || 0,
    addOnsAmount: Number(q.addOnsAmount) || 0,
    addOns: mergedAddOns,
    addOnsIncluded: mergedIncluded,
  };
};

/**
 * @param {unknown[]} raw
 * @returns {Array<Record<string, unknown> & { id: string | number }>}
 */
const normalizeQuotesFromApi = (raw) => {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeQuotesFromApi(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) {
    if (Array.isArray(raw?.data)) return normalizeQuotesFromApi(raw.data);
    if (Array.isArray(raw?.quotes)) return normalizeQuotesFromApi(raw.quotes);
    return [];
  }
  return raw.map((q, idx) => ({
    ...(typeof q === "object" && q ? q : {}),
    id: getQuoteRowId(q, idx),
  }));
};

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

/**
 * Same premium math as `quoteComputed` / addQuote, for a persisted quote row.
 * @param {Record<string, unknown>} q
 */
const computeQuoteBreakupFromRow = (q) => {
  if (!q || typeof q !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      basePremium: 0,
      ncbAmount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      totalPremium: 0,
      addOnLines: [],
    };
  }
  const addOns = q.addOns && typeof q.addOns === "object" ? q.addOns : {};
  const coverageType = String(q.coverageType || "Comprehensive");
  const isThirdPartyOnly = coverageType === "Third Party";
  const isOdOnly =
    coverageType === "Own Damage" || coverageType === "Stand Alone OD";
  const includesOd = !isThirdPartyOnly;
  const includesTp = !isOdOnly;
  const allowsAddOns = includesOd;
  const included =
    q.addOnsIncluded && typeof q.addOnsIncluded === "object"
      ? q.addOnsIncluded
      : {};
  const selectedAddOnsTotal = addOnCatalog.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);
  const hasAnySelectedAddOn = addOnCatalog.some((name) =>
    Boolean(included[name]),
  );
  const flatAddOnsAmount = Number(q.addOnsAmount || 0);
  const hasFlatOverride =
    flatAddOnsAmount > 0 &&
    hasAnySelectedAddOn &&
    Math.round(flatAddOnsAmount) !== Math.round(selectedAddOnsTotal);
  const rawAddOnsTotal = allowsAddOns
    ? hasAnySelectedAddOn
      ? hasFlatOverride
        ? flatAddOnsAmount
        : selectedAddOnsTotal
      : flatAddOnsAmount
    : 0;

  const addOnsTotal = rawAddOnsTotal;
  const addOnsSource = !allowsAddOns
    ? "none"
    : hasAnySelectedAddOn
      ? hasFlatOverride
        ? "flat_override"
        : "selected"
      : "flat";
  const normalizedOdAmount = Number(
    q.odAmount ?? q.ownDamage ?? q.basicOwnDamage ?? q.odPremium ?? 0,
  );
  const normalizedTpAmount = Number(
    q.thirdPartyAmount ?? q.thirdParty ?? q.basicThirdParty ?? q.tpPremium ?? 0,
  );
  const normalizedNcbDiscount = Number(
    q.ncbDiscount ?? q.newNcbDiscount ?? q.ncb_percentage ?? 0,
  );
  const odAmt = includesOd ? normalizedOdAmount : 0;
  const tpAmt = includesTp ? normalizedTpAmount : 0;
  const idvParts =
    Number(q.vehicleIdv || 0) +
    Number(q.cngIdv || 0) +
    Number(q.accessoriesIdv || 0);
  const storedIdv = Number(q.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;
  const basePremium = odAmt + tpAmt + addOnsTotal;
  const payoutBaseAmount = computePayoutBaseAmount(
    odAmt,
    addOnsTotal,
    q.insuranceCompany,
  );
  const ncbPct = normalizedNcbDiscount;
  const ncbReferenceAmount = Math.round((odAmt * ncbPct) / 100);
  const taxableAmount = Math.max(basePremium, 0);
  const gstAmount = Math.round(taxableAmount * 0.18);
  const totalPremium = taxableAmount + gstAmount;

  const addOnLines = addOnCatalog
    .filter((name) => included[name])
    .map((name) => ({
      name,
      amount: Number(addOns[name] || 0),
    }));

  return {
    addOnsTotal,
    addOnsSource,
    odAmt,
    tpAmt,
    totalIdv,
    basePremium,
    ncbReferenceAmount,
    ncbPct,
    taxableAmount,
    gstAmount,
    totalPremium,
    payoutBaseAmount,
    addOnLines,
  };
};

const formatStoredOrComputedIdv = (row) => {
  const s = Number(row?.totalIdv);
  if (Number.isFinite(s) && s > 0) return toINR(s);
  return toINR(computeQuoteBreakupFromRow(row).totalIdv);
};

const formatStoredOrComputedPremium = (row) => {
  return toINR(computeQuoteBreakupFromRow(row).totalPremium);
};

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

const buildAutoReceivableRow = (
  companyName,
  payoutPercentage,
  payoutAmount,
) => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");

  return {
    id: Date.now(),
    payoutId: `IR-${year}-${random}`,
    payout_createdAt: new Date().toISOString(),
    payout_type: "Bank",
    payout_party_name: companyName || "",
    payout_percentage: Number(payoutPercentage || 0),
    payout_amount: Number(payoutAmount || 0),
    tds_percentage: 0,
    tds_amount: 0,
    net_payout_amount: Number(payoutAmount || 0),
    payout_status: "Expected",
    payout_remarks: "Auto-generated from accepted quote",
    _autoGenerated: true,
  };
};

/** Strips spaces / +91 etc. so step save + validation match what users type. */
const normalizeIndianMobile = (raw) => {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("91")) d = d.slice(-10);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  else if (d.length > 10) d = d.slice(-10);
  return d;
};

/** Minimum to move past step 1 and create a DB draft — name + 10-digit mobile only. */
const validateStep1Minimal = (data) => {
  const errors = {};
  const isCompany = data.buyerType === "Company";
  const mobileDigits = normalizeIndianMobile(data.mobile);
  if (!mobileDigits) errors.mobile = "Mobile number is required";
  else if (mobileDigits.length !== 10)
    errors.mobile = "Enter a valid 10-digit mobile number";
  if (
    (data.alternatePhone || "").trim() &&
    normalizeIndianMobile(data.alternatePhone).length !== 10
  )
    errors.alternatePhone = "Enter a valid 10-digit alternate number";
  if (isCompany) {
    if (!(data.companyName || "").trim())
      errors.companyName = "Company name is required";
  } else if (!(data.customerName || "").trim()) {
    errors.customerName = "Customer name is required";
  }
  return errors;
};

/** Full checks before final submit (ops / compliance fields). */
const validateStep1Strict = (data) => {
  const errors = {};
  const isCompany = data.buyerType === "Company";
  const sourceMode = String(
    data.source || data.sourceOrigin || "Direct",
  ).trim();
  const policyDoneBy = String(data.policyDoneBy || "").trim();
  if (!(data.employeeName || "").trim())
    errors.employeeName = "Employee name is required";
  if (!(data.policyCategory || "").trim())
    errors.policyCategory = "Insurance category is required";
  if (!(policyDoneBy || "").trim())
    errors.policyDoneBy = "Policy done by is required";
  if (!(sourceMode || "").trim()) errors.source = "Source is required";
  const policyCategoryKey = String(
    data.policyCategory || data.policyTypeSelector || "",
  )
    .trim()
    .toLowerCase();
  const isExtendedWarranty =
    policyCategoryKey === "extended warranty" ||
    policyCategoryKey === "ew policy";

  if (
    String(data.vehicleType || "").trim() === "Used Car" &&
    !isExtendedWarranty
  ) {
    const usedCarFlowType = String(data.usedCarFlowType || "").trim();
    if (!usedCarFlowType) {
      errors.usedCarFlowType = "Used-car flow type is required";
    }
  }
  if (sourceMode === "Direct") {
    if (!(data.sourceName || "").trim())
      errors.sourceName = "Source name is required for direct cases";
  } else if (sourceMode === "Indirect") {
    if (!(data.dealerChannelName || "").trim())
      errors.dealerChannelName = "Dealer / Channel is required";
    if (!(data.dealerChannelAddress || "").trim())
      errors.dealerChannelAddress = "Dealer / Channel address is required";
    const dMobile = normalizeIndianMobile(data.dealerMobile);
    if (!dMobile) errors.dealerMobile = "Dealer mobile is required";
    else if (dMobile.length !== 10)
      errors.dealerMobile = "Enter a valid 10-digit dealer mobile";
    if (!(data.payoutApplicable || "").trim())
      errors.payoutApplicable = "Choose payout applicability";
    if (
      String(data.payoutApplicable || "").trim() === "Yes" &&
      (!Number.isFinite(Number(data.payoutPercent || "")) ||
        Number(data.payoutPercent || "") <= 0)
    ) {
      errors.payoutPercent = "Enter a valid payout %";
    }
  }
  if (policyDoneBy === "Broker" && !(data.brokerName || "").trim())
    errors.brokerName = "Broker name is required";
  if (policyDoneBy === "Showroom" && !(data.showroomName || "").trim())
    errors.showroomName = "Showroom name is required";
  const mobileDigits = normalizeIndianMobile(data.mobile);
  if (!mobileDigits) errors.mobile = "Mobile number is required";
  else if (mobileDigits.length !== 10)
    errors.mobile = "Enter a valid 10-digit mobile number";
  if (
    (data.alternatePhone || "").trim() &&
    normalizeIndianMobile(data.alternatePhone).length !== 10
  )
    errors.alternatePhone = "Enter a valid 10-digit alternate number";
  // if (!(data.email || "").trim()) errors.email = "Email address is required";
  if (!(data.pincode || "").trim()) errors.pincode = "Pincode is required";
  else if (!/^\d{6}$/.test((data.pincode || "").trim()))
    errors.pincode = "Enter a valid 6-digit pincode";
  if (!(data.city || "").trim()) errors.city = "City is required";
  if (isCompany) {
    if (!(data.companyName || "").trim())
      errors.companyName = "Company name is required";
    if (!(data.contactPersonName || "").trim())
      errors.contactPersonName = "Contact person name is required";
    if (!(data.panNumber || "").trim())
      errors.panNumber = "PAN number is required";
    if (!(data.residenceAddress || "").trim())
      errors.residenceAddress = "Residence address is required";
  } else {
    if (!(data.customerName || "").trim())
      errors.customerName = "Customer name is required";
    if (!(data.gender || "").trim()) errors.gender = "Gender is required";
    if (!(data.residenceAddress || "").trim())
      errors.residenceAddress = "Residence address is required";
  }

  if (!(data.nomineeName || "").trim())
    errors.nomineeName = "Nominee name is required";
  if (!(data.nomineeRelationship || "").trim())
    errors.nomineeRelationship = "Nominee relationship is required";
  const refDigits = normalizeIndianMobile(data.referencePhone);
  if ((data.referencePhone || "").trim() && refDigits.length !== 10) {
    errors.referencePhone = "Enter a valid 10-digit reference mobile";
  }

  return errors;
};

const summarizeFieldErrors = (errors = {}, max = 4) => {
  const messages = Object.values(errors || {}).filter(Boolean);
  if (!messages.length) return "";
  const head = messages.slice(0, max).join("; ");
  const extra =
    messages.length > max ? ` (+${messages.length - max} more)` : "";
  return `${head}${extra}`;
};

const validateStep2 = (data) => {
  const errors = {};
  if (data.vehicleType !== "New Car" && !(data.registrationNumber || "").trim())
    errors.registrationNumber = "Registration number is required";
  if (!(data.vehicleMake || "").trim())
    errors.vehicleMake = "Vehicle make is required";
  if (!(data.vehicleModel || "").trim())
    errors.vehicleModel = "Vehicle model is required";
  if (!(data.vehicleVariant || "").trim())
    errors.vehicleVariant = "Vehicle variant is required";
  if (!(data.engineNumber || "").trim())
    errors.engineNumber = "Engine number is required";
  if (!(data.chassisNumber || "").trim())
    errors.chassisNumber = "Chassis number is required";
  if (!(data.manufactureMonth || "").trim())
    errors.manufactureMonth = "Manufacture month is required";
  if (!(data.manufactureYear || "").trim())
    errors.manufactureYear = "Manufacture year is required";

  return errors;
};

const validateStep3 = (data) => {
  const errors = {};
  if (!String(data?.claimTakenLastYear || "").trim()) {
    errors.claimTakenLastYear = "Claim last year is required";
  }
  return errors;
};

/** Customer fields tracked against the CRM-loaded snapshot for change detection */
const CRM_CUSTOMER_FIELD_LABELS = {
  customerName: "Customer Name",
  companyName: "Company Name",
  contactPersonName: "Contact Person",
  mobile: "Mobile",
  alternatePhone: "Alternate Phone",
  email: "Email",
  gender: "Gender",
  panNumber: "PAN Number",
  aadhaarNumber: "Aadhaar Number",
  gstNumber: "GST Number",
  residenceAddress: "Address",
  pincode: "Pincode",
  city: "City",
};

const pickCrmCustomerSnapshot = (data) => {
  const snapshot = {};
  Object.keys(CRM_CUSTOMER_FIELD_LABELS).forEach((key) => {
    snapshot[key] = String(data?.[key] ?? "").trim();
  });
  return snapshot;
};

const NewInsuranceCaseForm = ({
  onCancel,
  onSubmit,
  mode = "create",
  initialValues = null,
  onDelete,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ...initialFormState,
    ...(initialValues || {}),
  });
  const [quotes, setQuotes] = useState([]);
  const [acceptedQuoteId, setAcceptedQuoteId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const isCreateMode = mode === "create";
  const freshDraft = React.useMemo(
    () => new URLSearchParams(location.search).has("fresh"),
    [location.search],
  );
  const autoSaveDraftTimerRef = React.useRef(null);
  const lastSavedDraftSnapshotRef = React.useRef(null);
  const currentDraftRef = React.useRef({});

  // Snapshot baseline — set once on mount (after initial values load), then
  // reset to current state after every successful save so the form becomes
  // "clean" again immediately after saving.
  const savedSnapshotRef = React.useRef(null);
  // Mirror of the current snapshot kept fresh in a ref so persistNow (which
  // closes over stale state) can still read the latest value without being
  // added to its dependency array.
  const currentSnapshotRef = React.useRef(null);

  useEffect(() => {
    const snap = JSON.stringify({
      formData,
      quotes,
      acceptedQuoteId,
      paymentHistory,
      docs: (documents || []).map((d) => ({ name: d?.name, tag: d?.tag, url: d?.url })),
    });
    currentSnapshotRef.current = snap;
    // First render: initialise the baseline so nothing looks dirty yet.
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = snap;
    }
  }, [formData, quotes, acceptedQuoteId, paymentHistory, documents]);

  const isFormDirty = useMemo(() => {
    if (savedSnapshotRef.current === null) return false;
    const snap = JSON.stringify({
      formData,
      quotes,
      acceptedQuoteId,
      paymentHistory,
      docs: (documents || []).map((d) => ({ name: d?.name, tag: d?.tag, url: d?.url })),
    });
    return snap !== savedSnapshotRef.current;
  }, [formData, quotes, acceptedQuoteId, paymentHistory, documents]);

  useEffect(() => {
    window.__isInsuranceFormDirty = isFormDirty;
    return () => {
      window.__isInsuranceFormDirty = false;
    };
  }, [isFormDirty]);

  usePreventPageRefresh(isFormDirty);

  // Unsaved-changes modal state
  const [unsavedModal, setUnsavedModal] = React.useState({
    open: false,
    pendingAction: null,
  });
  const [quoteDraft, setQuoteDraft] = useState(initialQuoteDraft);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [planFeaturesModal, setPlanFeaturesModal] = useState({
    open: false,
    row: null,
  });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paymentType: "customer",
    paymentMode: "Cash",
    transactionRef: "",
    remarks: "",
  });

  const [insuranceDbId, setInsuranceDbId] = useState(
    initialValues?._id || initialValues?.id || null,
  );
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState("");

  // ── New UI state ─────────────────────────────────────────────────────────
  /** True after Step 8 is submitted successfully */
  const [submitted, setSubmitted] = useState(false);
  /** Auto-generated case reference shown on the success screen */
  const [caseReference, setCaseReference] = useState("");

  const persistTimerRef = React.useRef(null);
  /** Serializes persist calls so concurrent autosave + step navigation always await a real result (never implicit `undefined`). */
  const persistChainRef = React.useRef(Promise.resolve());
  const stickyHeaderRef = React.useRef(null);
  const keyboardActionsRef = React.useRef({
    goNext: null,
    persistNow: null,
  });
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(96);

  // Customer search (for Employee Name / Step-1 auto-fill)
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [cityLookupLoading, setCityLookupLoading] = useState(false);
  const customerSearchDebounceRef = React.useRef(null);
  const cityLookupSeqRef = React.useRef(0);

  /**
   * Snapshot of customer fields right after an existing CRM customer is
   * loaded into the form. Used to detect edits to that data and warn the
   * user on change, on next-step and on final save.
   */
  const [crmCustomerSnapshot, setCrmCustomerSnapshot] = useState(null);

  /** Staff / users from DB for Employee field (not customer records) */
  const [employeesList, setEmployeesList] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [bankOptions, setBankOptions] = useState([]);

  // Vehicle search (Registration Number / Step-2 auto-fill)
  const [registrationLookupLoading, setRegistrationLookupLoading] =
    useState(false);
  const [registrationLookupOptions, setRegistrationLookupOptions] = useState(
    [],
  );
  const registrationLookupDebounceRef = React.useRef(null);
  const [isGeneratingTempReg, setIsGeneratingTempReg] = useState(false);
  const [includeDiscontinuedVehicles, setIncludeDiscontinuedVehicles] =
    useState(false);
  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [variantOptions, setVariantOptions] = useState([]);
  const cubicSyncRef = React.useRef(new Set());
  const vehicleDerivedCacheRef = React.useRef(new Map());
  const [vehiclePotentialMatch, setVehiclePotentialMatch] = useState(null);
  const [vehiclePotentialMatches, setVehiclePotentialMatches] = useState([]);
  const [vehicleMatchLoading, setVehicleMatchLoading] = useState(false);
  const [vehicleMergeLoading, setVehicleMergeLoading] = useState(false);
  const vehicleMatchDebounceRef = React.useRef(null);
  const [customerVehicleRows, setCustomerVehicleRows] = useState([]);
  const [customerVehicleLoading, setCustomerVehicleLoading] = useState(false);

  const getCustomerId = (c) => c?._id || c?.id || c?.customerId || null;

  // Helper: Calculate age from DOB
  const getAgeFromDob = (dob) => {
    if (!dob) return "";
    try {
      const birthDate = dayjs(dob);
      if (!birthDate.isValid()) return "";
      const age = dayjs().diff(birthDate, "year");
      return age > 0 && age < 150 ? String(age) : "";
    } catch {
      return "";
    }
  };

  const isCompany = formData.buyerType === "Company";
  const isNewCar = formData.vehicleType === "New Car";
  const policyCategoryKey = String(
    formData.policyCategory || formData.policyTypeSelector || "",
  )
    .trim()
    .toLowerCase();
  const isExtendedWarranty =
    policyCategoryKey === "extended warranty" ||
    policyCategoryKey === "ew policy";
  const usedCarFlowType = String(formData.usedCarFlowType || "Renewal").trim();
  const shouldSkipPreviousPolicyForUsedCar =
    formData.vehicleType === "Used Car" &&
    !isExtendedWarranty &&
    usedCarFlowType === "Sale/Purchase";
  const step4SuggestedNcb = useMemo(
    () =>
      getSuggestedStep4Ncb({
        previousNcbDiscount: formData.previousNcbDiscount,
        claimTakenLastYear: formData.claimTakenLastYear,
      }),
    [formData.claimTakenLastYear, formData.previousNcbDiscount],
  );
  const step4VehicleAgeYears = useMemo(() => {
    const regDateRaw = String(formData.dateOfReg || "").trim();
    if (regDateRaw) {
      const regDate = dayjs(regDateRaw);
      if (regDate.isValid()) return dayjs().diff(regDate, "year", true);
    }
    const mfgYear = Number(formData.manufactureYear || 0);
    if (Number.isFinite(mfgYear) && mfgYear > 1900) {
      return dayjs().diff(dayjs(`${mfgYear}-01-01`), "year", true);
    }
    return null;
  }, [formData.dateOfReg, formData.manufactureYear]);
  const step4ShowStandaloneAgeWarning =
    step4VehicleAgeYears != null && step4VehicleAgeYears > 3;
  const step4SuggestedIdv = useMemo(() => {
    const previousIdv = Number(formData.previousIdvAmount || 0);
    if (!Number.isFinite(previousIdv) || previousIdv <= 0) return 0;
    return Math.round(previousIdv * 0.9);
  }, [formData.previousIdvAmount]);

  const crmSnapshotPendingRef = React.useRef(false);

  const applyCustomerToForm = useCallback((customer) => {
    if (!customer) return;

    const normalized = {
      ...customer,
      ...mapCustomerToInsuranceFields(customer),
    };

    // First merge from search result — do NOT take snapshot yet to avoid
    // false-positive "data changed" warnings before getById fills full fields.
    setFormData((prev) =>
      mergeInsuranceCustomerFields(prev, normalized, { fillEmptyOnly: true }),
    );

    const customerId = getCustomerId(normalized);
    if (customerId) {
      customersApi
        .getById(customerId)
        .then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res;
          const full = raw && typeof raw === "object"
            ? { ...raw, ...mapCustomerToInsuranceFields(raw) }
            : normalized;
          // Snapshot is taken here — after all CRM fields are loaded.
          crmSnapshotPendingRef.current = true;
          setFormData((prev) =>
            mergeInsuranceCustomerFields(prev, full, { fillEmptyOnly: true }),
          );
        })
        .catch((err) => {
          console.error("[Insurance][CustomerById] fetch failed:", err);
          // On error, snapshot from first merge so diff-tracking still works.
          crmSnapshotPendingRef.current = true;
          setFormData((prev) => ({ ...prev }));
        });
    } else {
      // No ID — snapshot from the search-result merge.
      crmSnapshotPendingRef.current = true;
      setFormData((prev) => ({ ...prev }));
    }
  }, []);

  // Capture the post-merge form values as the CRM baseline once the merge
  // from applyCustomerToForm has been applied to formData.
  useEffect(() => {
    if (!crmSnapshotPendingRef.current) return;
    crmSnapshotPendingRef.current = false;
    setCrmCustomerSnapshot(pickCrmCustomerSnapshot(formData));
  }, [formData]);

  /** Labels of CRM-loaded customer fields the user has edited afterwards */
  const modifiedCrmFields = useMemo(() => {
    if (!crmCustomerSnapshot) return [];
    return Object.entries(CRM_CUSTOMER_FIELD_LABELS)
      .filter(
        ([key]) =>
          String(formData?.[key] ?? "").trim() !== crmCustomerSnapshot[key],
      )
      .map(([, label]) => label);
  }, [crmCustomerSnapshot, formData]);

  // Note: auto-toast removed — false positives fired during the two-phase CRM
  // async load (search result merge → getById merge). Confirmation is handled
  // by confirmCrmCustomerChanges() at step-advance and save time instead.

  /**
   * Confirm before continuing when CRM-loaded customer data was edited.
   * Resolves true to proceed (and re-baselines the snapshot so the same
   * edits are not asked about again), false to stay.
   */
  const confirmCrmCustomerChanges = useCallback(() => {
    if (!modifiedCrmFields.length) return Promise.resolve(true);
    return new Promise((resolve) => {
      Modal.confirm({
        title: "Existing customer data changed",
        content: `You have changed these details of an existing customer: ${modifiedCrmFields.join(
          ", ",
        )}. Do you want to continue with the updated details?`,
        okText: "Yes, continue",
        cancelText: "No, review",
        onOk: () => {
          setCrmCustomerSnapshot(pickCrmCustomerSnapshot(formData));
          resolve(true);
        },
        onCancel: () => resolve(false),
      });
    });
  }, [modifiedCrmFields, formData]);

  const applyReferenceFromCustomer = useCallback((customer) => {
    if (!customer) return;

    const normalized = {
      ...customer,
      ...mapCustomerToInsuranceFields(customer),
    };
    setFormData((prev) =>
      mergeInsuranceReferenceFields(prev, normalized, { fillEmptyOnly: true }),
    );

    const customerId = getCustomerId(normalized);
    if (customerId) {
      customersApi
        .getById(customerId)
        .then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res;
          if (!raw || typeof raw !== "object") return;
          const full = { ...raw, ...mapCustomerToInsuranceFields(raw) };
          setFormData((prev) =>
            mergeInsuranceReferenceFields(prev, full, { fillEmptyOnly: true }),
          );
        })
        .catch((err) => {
          console.error("[Insurance][ReferenceById] fetch failed:", err);
        });
    }
  }, []);

  useEffect(() => {
    const customerId = String(formData.customerId || "").trim();
    if (!customerId) return undefined;

    let cancelled = false;

    const run = async () => {
      try {
        const [custRes, loansRes] = await Promise.all([
          customersApi.getById(customerId),
          loansApi.getAll({ customerId, limit: 80 }),
        ]);
        if (cancelled) return;

        const rawCustomer =
          custRes?.data?.data ?? custRes?.data ?? custRes ?? null;
        const loans = Array.isArray(loansRes?.data) ? loansRes.data : [];

        const linked = collectLinkedDocumentsForInsurance(rawCustomer, loans);
        if (!linked.length) return;

        setDocuments((prev) => mergeLinkedIntoExistingDocuments(prev, linked));
      } catch (err) {
        console.error(
          "[Insurance][CustomerDocs] Linked documents merge failed:",
          err,
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [formData.customerId]);

  const searchCustomers = useCallback(
    (q) => {
      const query = String(q || "").trim();
      if (customerSearchDebounceRef.current) {
        clearTimeout(customerSearchDebounceRef.current);
      }

      // Debounce to prevent flooding backend
      customerSearchDebounceRef.current = setTimeout(async () => {
        if (!query || query.length < 2) {
          setCustomerSearchResults([]);
          return;
        }

        setCustomerSearchLoading(true);
        try {
          const res = await customersApi.search(query);
          const rows = normalizeCustomerSearchPayload(res).map((row) => ({
            ...row,
            ...mapCustomerToInsuranceFields(row),
          }));
          setCustomerSearchResults(rows);
        } catch (err) {
          console.error("[Insurance][CustomerSearch] error:", err);
          setCustomerSearchResults([]);
        } finally {
          setCustomerSearchLoading(false);
        }
      }, 280);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEmployeesLoading(true);
      try {
        const list = await getEmployees();
        if (cancelled) return;
        setEmployeesList(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("[Insurance][Employees] load failed:", err);
        if (!cancelled) setEmployeesList([]);
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const limit = 1000;
        let skip = 0;
        let page = [];
        const bankSet = new Set();
        let guard = 0;

        do {
          const res = await loansApi.getAll({
            limit,
            skip,
            noCount: true,
            view: "dashboard",
            sortBy: "updatedAt",
            sortDir: "desc",
          });
          page = Array.isArray(res?.data) ? res.data : [];
          page.forEach((loan) => {
            const topLevel = String(loan?.approval_bankName || "").trim();
            if (topLevel) bankSet.add(topLevel);
            if (Array.isArray(loan?.approval_banksData)) {
              loan.approval_banksData.forEach((row) => {
                const bankName = String(row?.bankName || "").trim();
                if (bankName) bankSet.add(bankName);
              });
            }
          });
          skip += limit;
          guard += 1;
        } while (page.length === limit && guard < 20);

        if (ignore) return;
        setBankOptions(Array.from(bankSet).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.error("[Insurance][LoanApprovalBanks] load failed:", err);
        if (!ignore) setBankOptions([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const employeeOptions = useMemo(() => {
    const q = String(formData.employeeName || "")
      .trim()
      .toLowerCase();
    return (employeesList || [])
      .filter((emp) => {
        if (!q) return true;
        const name = String(emp?.name || "").toLowerCase();
        const email = String(emp?.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 12)
      .map((emp) => ({
        value: String(emp._id || emp.id || ""),
        label: (
          <div>
            <div style={{ fontWeight: 500 }}>{emp.name || "User"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {emp.email || "—"}
              {emp.role ? ` · ${emp.role}` : ""}
            </div>
          </div>
        ),
      }))
      .filter((opt) => opt.value);
  }, [employeesList, formData.employeeName]);

  const parseCubicCapacityValue = useCallback((value) => {
    if (value === undefined || value === null) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const match = raw.match(/(\d{2,5})/);
    return match ? match[1] : "";
  }, []);

  const normalizeDateInputValue = useCallback((value) => {
    if (value === undefined || value === null) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const parsed = dayjs(raw);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
    const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, "0");
      const mm = dmy[2].padStart(2, "0");
      const yyyy = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
  }, []);

  const normalizeFormDates = useCallback(
    (data = {}) => {
      const next = { ...(data || {}) };
      [
        "nomineeDob",
        "dateOfReg",
        "previousPolicyStartDate",
        "previousOdExpiryDate",
        "previousTpExpiryDate",
        "newIssueDate",
        "newPolicyStartDate",
        "newOdExpiryDate",
        "newTpExpiryDate",
        "dateOfSale",
        "dateOfPurchase",
        "policyPurchaseDate",
        "ewCommencementDate",
        "ewExpiryDate",
      ].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(next, key)) {
          next[key] = normalizeDateInputValue(next[key]);
        }
      });
      return next;
    },
    [normalizeDateInputValue],
  );

  const normalizeVehicleToken = useCallback(
    (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    [],
  );

  const normalizeVehicleMakeToken = useCallback(
    (value) => {
      const token = normalizeVehicleToken(value);
      if (!token) return "";
      if (token === "marutisuzuki" || token === "marutisuzukiindia")
        return "maruti";
      if (token === "bmwindia" || token === "bayerischemotorenwerke")
        return "bmw";
      return token;
    },
    [normalizeVehicleToken],
  );

  const normalizePersonToken = useCallback(
    (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    [],
  );

  const normalizeFuelLabel = useCallback((value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const key = raw.toLowerCase();
    if (key.includes("electric") || key.includes("ev")) return "EV";
    if (key.includes("hybrid")) return "Hybrid";
    if (
      (key.includes("cng") && key.includes("petrol")) ||
      (key.includes("petrol") && key.includes("cng"))
    ) {
      return "Petrol + CNG";
    }
    if (key.includes("cng")) return "CNG";
    if (
      key.includes("diesel") ||
      key.includes("crdi") ||
      key.includes("dci") ||
      key.includes("tdi")
    ) {
      return "Diesel";
    }
    if (
      key.includes("petrol") ||
      key.includes("mpi") ||
      key.includes("tsi") ||
      key.includes("tgdi")
    ) {
      return "Petrol";
    }
    return raw;
  }, []);

  const applyVehicleToForm = useCallback(
    (vehicle) => {
      if (!vehicle) return;
      const normalizedFuel = normalizeFuelLabel(
        vehicle.fuelType || vehicle.fuel || vehicle.vehicleFuelType || "",
      );
      const normalizedCubic = parseCubicCapacityValue(
        vehicle.cubicCapacityCc ||
          vehicle.cubicCapacity ||
          vehicle.cc ||
          vehicle.engineCC ||
          "",
      );
      setFormData((prev) => ({
        ...prev,
        registrationAllotted: "Yes",
        registrationNumber:
          vehicle.registrationNumber ||
          vehicle.regNo ||
          vehicle.registration ||
          prev.registrationNumber,
        vehicleMake:
          vehicle.vehicleMake ||
          vehicle.make ||
          vehicle.brand ||
          prev.vehicleMake,
        vehicleModel:
          vehicle.vehicleModel || vehicle.model || prev.vehicleModel,
        vehicleVariant:
          vehicle.vehicleVariant ||
          vehicle.variant ||
          vehicle.variantName ||
          prev.vehicleVariant,
        fuelType: normalizedFuel || "",
        cubicCapacity: normalizedCubic || "",
        engineNumber:
          vehicle.engineNumber || vehicle.engineNo || prev.engineNumber,
        chassisNumber:
          vehicle.chassisNumber || vehicle.chasisNo || prev.chassisNumber,
        typesOfVehicle:
          vehicle.typesOfVehicle ||
          vehicle.vehicleType ||
          vehicle.type ||
          prev.typesOfVehicle,
        manufactureMonth:
          vehicle.manufactureMonth ||
          vehicle.mfgMonth ||
          vehicle.month ||
          prev.manufactureMonth,
        manufactureYear:
          vehicle.manufactureYear ||
          vehicle.yearOfManufacture ||
          vehicle.mfgYear ||
          vehicle.year ||
          prev.manufactureYear,
        regAuthority:
          vehicle.regAuthority ||
          vehicle.registrationCity ||
          vehicle.reg_authority ||
          prev.regAuthority,
        dateOfReg:
          normalizeDateInputValue(
            vehicle.registrationDate ||
              vehicle.dateOfReg ||
              vehicle.date_of_reg ||
              prev.dateOfReg,
          ) || prev.dateOfReg,
        batteryNumber:
          vehicle.batteryNumber || vehicle.battery_number || prev.batteryNumber,
        chargerNumber:
          vehicle.chargerNumber || vehicle.charger_number || prev.chargerNumber,
        hypothecation:
          vehicle.hypothecation ||
          vehicle.hypothecationBank ||
          prev.hypothecation ||
          "Not applicable",
      }));
    },
    [normalizeDateInputValue, normalizeFuelLabel, parseCubicCapacityValue],
  );

  const handleRegistrationSearch = useCallback((q) => {
    const query = String(q || "")
      .trim()
      .toUpperCase();
    if (registrationLookupDebounceRef.current) {
      clearTimeout(registrationLookupDebounceRef.current);
    }

    if (!query || query.length < 2) {
      setRegistrationLookupOptions([]);
      return;
    }

    registrationLookupDebounceRef.current = setTimeout(async () => {
      setRegistrationLookupLoading(true);
      try {
        const res = await vehiclesApi.searchMasterRecords(query, 10);
        const rows = Array.isArray(res?.data) ? res.data : [];
        const options = rows.map((row) => {
          const registration = String(
            row?.registrationNumber || row?.regNo || "",
          ).trim();
          const make = String(row?.make || row?.vehicleMake || "").trim();
          const model = String(row?.model || row?.vehicleModel || "").trim();
          const variant = String(
            row?.variant || row?.vehicleVariant || "",
          ).trim();
          const customerName = String(row?.customerName || "").trim();
          const primaryMobile = String(row?.primaryMobile || "").trim();
          return {
            value: registration,
            label: (
              <div>
                <div style={{ fontWeight: 600 }}>
                  {registration || "Registration"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {[make, model, variant].filter(Boolean).join(" ")}
                </div>
                {(customerName || primaryMobile) && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {[customerName, primaryMobile].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            ),
            vehicleData: row,
          };
        });
        setRegistrationLookupOptions(options);
      } catch (err) {
        console.error("[Insurance][RegistrationLookup] error:", err);
        setRegistrationLookupOptions([]);
      } finally {
        setRegistrationLookupLoading(false);
      }
    }, 280);
  }, []);

  useEffect(() => {
    let ignore = false;
    const customerName = String(
      formData.customerName || formData.companyName || "",
    ).trim();
    const mobile = String(formData.mobile || "").trim();
    const selectedCustomerId = String(formData.customerId || "").trim();

    if (step !== 2 || isNewCar || (!customerName && mobile.length < 4)) {
      setCustomerVehicleRows([]);
      setCustomerVehicleLoading(false);
      return;
    }

    (async () => {
      setCustomerVehicleLoading(true);
      try {
        const queryList = [];
        if (customerName.length >= 2) {
          queryList.push(customerName);
        } else if (mobile.length >= 4) {
          queryList.push(mobile.slice(-4));
        }
        const payloads = await Promise.all(
          queryList.map((query) => vehiclesApi.searchMasterRecords(query, 200)),
        );
        const merged = [];
        payloads.forEach((payload) => {
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          merged.push(...rows);
        });

        const dedup = new Map();
        merged.forEach((row, idx) => {
          const key = String(
            row?.registrationNumberNormalized ||
              row?.registrationNumber ||
              row?.regNo,
          )
            .trim()
            .toUpperCase();
          const fallbackKey = String(
            row?._id ||
              row?.vehicleId ||
              row?.chassisNumber ||
              row?.engineNumber ||
              `${row?.make || row?.vehicleMake || ""}|${row?.model || row?.vehicleModel || ""}|${row?.variant || row?.vehicleVariant || ""}|${idx}`,
          )
            .trim()
            .toUpperCase();
          const dedupKey = key || fallbackKey;
          if (!dedupKey) return;
          if (!dedup.has(dedupKey)) dedup.set(dedupKey, row);
        });

        const customerNameLc = customerName.toLowerCase();
        const selectedCustomerToken = normalizePersonToken(customerNameLc);
        const filtered = Array.from(dedup.values()).filter((row) => {
          const rowCustomerId = String(
            row?.customerId || row?.customer_id || "",
          ).trim();
          const rowCustomer = String(row?.customerName || "")
            .trim()
            .toLowerCase();
          const rowCustomerToken = normalizePersonToken(rowCustomer);
          const rowMobile = String(row?.primaryMobile || "").trim();
          const nameMatch = customerNameLc
            ? selectedCustomerToken &&
              rowCustomerToken &&
              (rowCustomerToken.includes(selectedCustomerToken) ||
                selectedCustomerToken.includes(rowCustomerToken))
            : false;
          const customerIdMatch =
            selectedCustomerId &&
            rowCustomerId &&
            selectedCustomerId === rowCustomerId;
          const mobileMatch =
            mobile.length >= 4
              ? rowMobile.replace(/\D/g, "").endsWith(mobile.slice(-4))
              : false;

          // Strict matching to avoid cross-customer bleed:
          // 1) Prefer exact customer-id matches (when available)
          // 2) Else prefer name match
          // 3) Use mobile fallback only when no name is available
          if (customerIdMatch) return true;
          if (customerNameLc) return nameMatch;
          return mobileMatch;
        });

        if (!ignore) setCustomerVehicleRows(filtered);
      } catch (err) {
        console.error("[Insurance][CustomerVehicles] load failed:", err);
        if (!ignore) setCustomerVehicleRows([]);
      } finally {
        if (!ignore) setCustomerVehicleLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [
    formData.companyName,
    formData.customerId,
    formData.customerName,
    formData.mobile,
    isNewCar,
    normalizePersonToken,
    step,
  ]);

  const hydrateVehicleSelectionOptions = useCallback(
    async ({ make = "", model = "", variant = "" } = {}) => {
      const nextMake = String(make || "").trim();
      const nextModel = String(model || "").trim();
      const nextVariant = String(variant || "").trim();
      const pickBest = (
        options = [],
        rawValue = "",
        normalizer = normalizeVehicleToken,
      ) => {
        const input = String(rawValue || "").trim();
        if (!input) return "";
        const inputToken = normalizer(input);
        if (!inputToken) return input;
        const exact = (options || []).find(
          (option) => normalizer(option) === inputToken,
        );
        if (exact) return exact;
        const fuzzy = (options || []).find((option) => {
          const optionToken = normalizer(option);
          return (
            optionToken &&
            (optionToken.includes(inputToken) ||
              inputToken.includes(optionToken))
          );
        });
        return fuzzy || input;
      };

      let resolvedMake = nextMake;
      let resolvedModel = nextModel;
      let resolvedVariant = nextVariant;

      if (nextMake) {
        setMakeOptions((prev) => {
          const merged = new Set([...(prev || []), nextMake]);
          return Array.from(merged).sort((a, b) => a.localeCompare(b));
        });
        const baseMakeOptions = Array.from(
          new Set([...(makeOptions || []), nextMake]),
        ).sort((a, b) => a.localeCompare(b));
        resolvedMake = pickBest(
          baseMakeOptions,
          nextMake,
          normalizeVehicleMakeToken,
        );
      }

      if (resolvedMake) {
        try {
          const res = await vehiclesApi.getUniqueModels(
            resolvedMake,
            null,
            includeDiscontinuedVehicles,
          );
          const fetched = Array.isArray(res?.data) ? res.data : [];
          const merged = new Set([
            ...fetched,
            ...(nextModel ? [nextModel] : []),
          ]);
          const modelList = Array.from(merged).sort((a, b) =>
            a.localeCompare(b),
          );
          setModelOptions(modelList);
          resolvedModel = pickBest(modelList, nextModel, normalizeVehicleToken);
        } catch (err) {
          console.error("[Insurance][HydrateModels] error:", err);
          if (nextModel) {
            setModelOptions((prev) => {
              const merged = new Set([...(prev || []), nextModel]);
              return Array.from(merged).sort((a, b) => a.localeCompare(b));
            });
          }
        }
      }

      if (resolvedMake && resolvedModel) {
        try {
          const res = await vehiclesApi.getUniqueVariants(
            resolvedMake,
            resolvedModel,
            null,
            includeDiscontinuedVehicles,
          );
          const fetched = Array.isArray(res?.data) ? res.data : [];
          const merged = new Set([
            ...fetched,
            ...(nextVariant ? [nextVariant] : []),
          ]);
          const variantList = Array.from(merged).sort((a, b) =>
            a.localeCompare(b),
          );
          setVariantOptions(variantList);
          resolvedVariant = pickBest(
            variantList,
            nextVariant,
            normalizeVehicleToken,
          );
        } catch (err) {
          console.error("[Insurance][HydrateVariants] error:", err);
          if (nextVariant) {
            setVariantOptions((prev) => {
              const merged = new Set([...(prev || []), nextVariant]);
              return Array.from(merged).sort((a, b) => a.localeCompare(b));
            });
          }
        }
      }

      return {
        make: resolvedMake || nextMake,
        model: resolvedModel || nextModel,
        variant: resolvedVariant || nextVariant,
      };
    },
    [
      includeDiscontinuedVehicles,
      makeOptions,
      normalizeVehicleMakeToken,
      normalizeVehicleToken,
    ],
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await vehiclesApi.getUniqueMakes(
          null,
          includeDiscontinuedVehicles,
        );
        if (ignore) return;
        setMakeOptions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("[Insurance][FetchMakes] error:", err);
        if (!ignore) setMakeOptions([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [includeDiscontinuedVehicles]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!formData.vehicleMake) {
        setModelOptions([]);
        return;
      }
      try {
        const res = await vehiclesApi.getUniqueModels(
          formData.vehicleMake,
          null,
          includeDiscontinuedVehicles,
        );
        if (ignore) return;
        setModelOptions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("[Insurance][FetchModels] error:", err);
        if (!ignore) setModelOptions([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [formData.vehicleMake, includeDiscontinuedVehicles]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!formData.vehicleMake || !formData.vehicleModel) {
        setVariantOptions([]);
        return;
      }
      try {
        const res = await vehiclesApi.getUniqueVariants(
          formData.vehicleMake,
          formData.vehicleModel,
          null,
          includeDiscontinuedVehicles,
        );
        if (ignore) return;
        setVariantOptions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("[Insurance][FetchVariants] error:", err);
        if (!ignore) setVariantOptions([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [
    formData.vehicleMake,
    formData.vehicleModel,
    includeDiscontinuedVehicles,
  ]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (
        !isNewCar ||
        String(formData.registrationAllotted || "Yes") !== "No"
      ) {
        return;
      }
      const existingReg = String(formData.registrationNumber || "").trim();
      if (existingReg) return;
      setIsGeneratingTempReg(true);
      try {
        const res = await insuranceApi.getNextTempRegistration();
        const nextTempReg = String(
          res?.data?.registrationNumber || res?.registrationNumber || "",
        ).trim();
        if (!ignore && nextTempReg) {
          setFormData((prev) => ({
            ...prev,
            registrationNumber: nextTempReg,
          }));
        }
      } catch (err) {
        console.error("[Insurance][TempRegistration] error:", err);
      } finally {
        if (!ignore) setIsGeneratingTempReg(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [formData.registrationAllotted, formData.registrationNumber, isNewCar]);

  const refreshVehicleDerivedFields = useCallback(
    async ({
      make = "",
      model = "",
      variant = "",
      registrationNumber = "",
      seedRow = null,
      preserveExistingOnMiss = true,
    } = {}) => {
      const resolvedMake = String(
        make ||
          formData.vehicleMake ||
          seedRow?.make ||
          seedRow?.vehicleMake ||
          "",
      ).trim();
      const resolvedModel = String(
        model ||
          formData.vehicleModel ||
          seedRow?.model ||
          seedRow?.vehicleModel ||
          "",
      ).trim();
      const resolvedVariant = String(
        variant ||
          formData.vehicleVariant ||
          seedRow?.variant ||
          seedRow?.vehicleVariant ||
          "",
      ).trim();
      const resolvedRegNo = String(
        registrationNumber ||
          formData.registrationNumber ||
          seedRow?.registrationNumber ||
          seedRow?.regNo ||
          "",
      ).trim();
      const cacheKey = [
        normalizeVehicleToken(resolvedMake),
        normalizeVehicleToken(resolvedModel),
        normalizeVehicleToken(resolvedVariant),
      ].join("|");
      const cached = vehicleDerivedCacheRef.current.get(cacheKey) || null;

      let fallbackRow = seedRow || null;
      let fuelCandidate = normalizeFuelLabel(
        fallbackRow?.fuelType ||
          fallbackRow?.fuel ||
          fallbackRow?.vehicleFuelType ||
          "",
      );
      let finalCubic = parseCubicCapacityValue(
        fallbackRow?.cubicCapacityCc ||
          fallbackRow?.cubicCapacity ||
          fallbackRow?.cc ||
          "",
      );

      if (!fuelCandidate && cached?.fuelType) {
        fuelCandidate = normalizeFuelLabel(cached.fuelType);
      }
      if (!finalCubic && cached?.cubicCapacity) {
        finalCubic = parseCubicCapacityValue(cached.cubicCapacity);
      }

      // Instant visible update from seed/cache before deeper lookups.
      if (fuelCandidate || finalCubic) {
        setFormData((prev) => ({
          ...prev,
          fuelType:
            fuelCandidate ||
            (preserveExistingOnMiss ? prev.fuelType || "" : ""),
          cubicCapacity:
            finalCubic ||
            (preserveExistingOnMiss ? prev.cubicCapacity || "" : ""),
        }));
      }

      if (!resolvedMake || !resolvedModel || !resolvedVariant) {
        if (!fuelCandidate && !finalCubic) return;
        return;
      }

      // Fast path: use cache and skip network if already complete.
      if (cached?.fuelType && cached?.cubicCapacity) {
        if (resolvedRegNo && cached.cubicCapacity) {
          const syncKey = `${String(resolvedRegNo || "").toUpperCase()}|${cached.cubicCapacity}|${resolvedMake}|${resolvedModel}|${resolvedVariant}`;
          if (!cubicSyncRef.current.has(syncKey)) {
            cubicSyncRef.current.add(syncKey);
          }
        }
        return;
      }

      const [detailsResult, featuresResult] = await Promise.allSettled([
        vehiclesApi.getByDetails(resolvedMake, resolvedModel, resolvedVariant),
        featuresApi.getBySelection({
          make: resolvedMake,
          model: resolvedModel,
          variant: resolvedVariant,
        }),
      ]);

      if (detailsResult.status === "fulfilled") {
        const detailsRaw = detailsResult.value?.data;
        const details = Array.isArray(detailsRaw)
          ? detailsRaw[0] || null
          : detailsRaw || null;
        if (details) {
          fallbackRow = details;
          if (!fuelCandidate) {
            fuelCandidate = normalizeFuelLabel(
              details?.fuelType ||
                details?.fuel ||
                details?.vehicleFuelType ||
                "",
            );
          }
          if (!finalCubic) {
            finalCubic = parseCubicCapacityValue(
              details?.cubicCapacityCc ||
                details?.cubicCapacity ||
                details?.cc ||
                details?.engineCC ||
                "",
            );
          }
        }
      }

      let featureRows = [];
      if (featuresResult.status === "fulfilled") {
        featureRows = Array.isArray(featuresResult.value?.data)
          ? featuresResult.value.data
          : [];
        if (!fuelCandidate) {
          const fuelFeature = featureRows.find((row) =>
            String(row?.name || "")
              .toLowerCase()
              .includes("fuel"),
          );
          fuelCandidate = normalizeFuelLabel(fuelFeature?.value || "");
        }
        if (!finalCubic) {
          const displacementFeature = featureRows.find((row) =>
            String(row?.name || "")
              .toLowerCase()
              .includes("displacement"),
          );
          finalCubic = parseCubicCapacityValue(
            displacementFeature?.value || "",
          );
        }
      }

      if ((!fuelCandidate || !finalCubic) && !fallbackRow) {
        try {
          const searchSeed = [resolvedMake, resolvedModel, resolvedVariant]
            .filter(Boolean)
            .join(" ");
          const searchRes = await vehiclesApi.searchMasterRecords(
            searchSeed,
            12,
          );
          const rows = Array.isArray(searchRes?.data) ? searchRes.data : [];
          const targetMake = normalizeVehicleToken(resolvedMake);
          const targetMakeAlias = normalizeVehicleMakeToken(resolvedMake);
          const targetModel = normalizeVehicleToken(resolvedModel);
          const targetVariant = normalizeVehicleToken(resolvedVariant);
          fallbackRow =
            rows.find((row) => {
              const mk = normalizeVehicleMakeToken(
                row?.make || row?.vehicleMake,
              );
              const md = normalizeVehicleToken(row?.model || row?.vehicleModel);
              const vr = normalizeVehicleToken(
                row?.variant || row?.vehicleVariant,
              );
              return (
                (mk.includes(targetMakeAlias) ||
                  targetMakeAlias.includes(mk) ||
                  mk.includes(targetMake)) &&
                md.includes(targetModel) &&
                (vr.includes(targetVariant) || targetVariant.includes(vr))
              );
            }) ||
            rows[0] ||
            null;

          if (fallbackRow) {
            if (!fuelCandidate) {
              fuelCandidate = normalizeFuelLabel(
                fallbackRow?.fuelType ||
                  fallbackRow?.fuel ||
                  fallbackRow?.vehicleFuelType ||
                  "",
              );
            }
            if (!finalCubic) {
              finalCubic = parseCubicCapacityValue(
                fallbackRow?.cubicCapacityCc ||
                  fallbackRow?.cubicCapacity ||
                  fallbackRow?.cc ||
                  fallbackRow?.engineCC ||
                  "",
              );
            }
          }
        } catch (err) {
          console.error("[Insurance][VehicleFallbackSearch] error:", err);
        }
      }

      try {
        if (!finalCubic) {
          const res = await insuranceApi.resolveVehicleCubicCapacity({
            make: resolvedMake,
            model: resolvedModel,
            variant: resolvedVariant,
            registrationNumber: resolvedRegNo,
          });
          const cubicCapacity = parseCubicCapacityValue(
            res?.data?.cubicCapacity ?? res?.cubicCapacity ?? "",
          );
          finalCubic = cubicCapacity || finalCubic;
        }
      } catch (err) {
        console.error("[Insurance][ResolveCubicCapacity] error:", err);
      }

      setFormData((prev) => ({
        ...prev,
        fuelType:
          fuelCandidate || (preserveExistingOnMiss ? prev.fuelType || "" : ""),
        cubicCapacity:
          finalCubic ||
          (preserveExistingOnMiss ? prev.cubicCapacity || "" : ""),
      }));

      vehicleDerivedCacheRef.current.set(cacheKey, {
        fuelType: fuelCandidate || "",
        cubicCapacity: finalCubic || "",
      });

      if (finalCubic && resolvedRegNo) {
        const syncKey = `${String(resolvedRegNo || "").toUpperCase()}|${finalCubic}|${resolvedMake}|${resolvedModel}|${resolvedVariant}`;
        if (!cubicSyncRef.current.has(syncKey)) {
          cubicSyncRef.current.add(syncKey);
        }
      }
    },
    [
      formData.registrationNumber,
      formData.vehicleMake,
      formData.vehicleModel,
      formData.vehicleVariant,
      normalizeFuelLabel,
      normalizeVehicleMakeToken,
      normalizeVehicleToken,
      parseCubicCapacityValue,
    ],
  );

  useEffect(() => {
    if (
      !formData.vehicleMake ||
      !formData.vehicleModel ||
      !formData.vehicleVariant
    ) {
      return;
    }
    refreshVehicleDerivedFields({
      make: formData.vehicleMake,
      model: formData.vehicleModel,
      variant: formData.vehicleVariant,
      registrationNumber: formData.registrationNumber,
      preserveExistingOnMiss: false,
    });
  }, [
    formData.registrationNumber,
    formData.vehicleMake,
    formData.vehicleModel,
    formData.vehicleVariant,
    refreshVehicleDerivedFields,
  ]);

  useEffect(() => {
    if (isExtendedWarranty) {
      setFormData((prev) => {
        if (
          prev.usedCarFlowType === "" &&
          prev.policyJourneyClassification === "EW Policy" &&
          prev.newPolicyType === "EW Policy"
        ) {
          return prev;
        }
        return {
          ...prev,
          usedCarFlowType: "",
          policyJourneyClassification: "EW Policy",
          newPolicyType: "EW Policy",
        };
      });
    }
  }, [isExtendedWarranty]);

  useEffect(() => {
    const normalizedFuel = normalizeFuelLabel(formData.fuelType || "");
    if (!normalizedFuel) return;
    if (normalizedFuel === formData.fuelType) return;
    setFormData((prev) => ({
      ...prev,
      fuelType: normalizedFuel,
    }));
  }, [formData.fuelType, normalizeFuelLabel]);

  useEffect(() => {
    if (vehicleMatchDebounceRef.current) {
      clearTimeout(vehicleMatchDebounceRef.current);
    }

    if (step !== 2) {
      setVehiclePotentialMatch(null);
      setVehiclePotentialMatches([]);
      setVehicleMatchLoading(false);
      return;
    }

    const make = String(formData.vehicleMake || "").trim();
    const model = String(formData.vehicleModel || "").trim();
    const variant = String(formData.vehicleVariant || "").trim();
    const engineNumber = String(formData.engineNumber || "").trim();
    const chassisNumber = String(formData.chassisNumber || "").trim();

    const registrationNumber = String(formData.registrationNumber || "").trim();

    if (
      !registrationNumber &&
      (!make || !model || !variant) &&
      !engineNumber &&
      !chassisNumber
    ) {
      setVehiclePotentialMatch(null);
      setVehiclePotentialMatches([]);
      setVehicleMatchLoading(false);
      return;
    }

    vehicleMatchDebounceRef.current = setTimeout(async () => {
      setVehicleMatchLoading(true);
      try {
        const res = await insuranceApi.findPotentialVehicleMatch({
          make,
          model,
          variant,
          manufactureMonth: formData.manufactureMonth,
          manufactureYear: formData.manufactureYear,
          engineNumber,
          chassisNumber,
          currentRegistrationNumber: formData.registrationNumber,
        });
        const matches = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setVehiclePotentialMatches(matches);
        setVehiclePotentialMatch(matches[0] || null);
      } catch (err) {
        console.error("[Insurance][VehicleMatch] error:", err);
        setVehiclePotentialMatch(null);
        setVehiclePotentialMatches([]);
      } finally {
        setVehicleMatchLoading(false);
      }
    }, 340);
  }, [
    formData.chassisNumber,
    formData.engineNumber,
    formData.manufactureMonth,
    formData.manufactureYear,
    formData.registrationNumber,
    formData.vehicleMake,
    formData.vehicleModel,
    formData.vehicleVariant,
    step,
  ]);

  const handleMergeVehicleMatch = useCallback(
    async (candidate) => {
      const activeCandidate = candidate || vehiclePotentialMatch;
      if (!activeCandidate?._id) return;
      setVehicleMergeLoading(true);
      try {
        const res = await insuranceApi.mergeVehicleMatch({
          insuranceCaseId: insuranceDbId || undefined,
          matchedVehicleRecordId: activeCandidate._id,
          currentRegistrationNumber: formData.registrationNumber,
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          variant: formData.vehicleVariant,
          manufactureMonth: formData.manufactureMonth,
          manufactureYear: formData.manufactureYear,
          engineNumber: formData.engineNumber,
          chassisNumber: formData.chassisNumber,
          dateOfReg: formData.dateOfReg,
          regAuthority: formData.regAuthority,
          fuelType: formData.fuelType,
          typesOfVehicle: formData.typesOfVehicle,
          batteryNumber: formData.batteryNumber,
          chargerNumber: formData.chargerNumber,
          hypothecation: formData.hypothecation,
          customerName: formData.customerName || formData.companyName,
          primaryMobile: formData.mobile,
          cubicCapacityCc: Number(formData.cubicCapacity || 0),
          overwriteHistoricalRecords: true,
        });
        const merged =
          res?.data?.data?.mergedVehicleRecord ||
          res?.data?.mergedVehicleRecord ||
          null;
        const canonicalRegistration =
          res?.data?.data?.canonicalRegistration ||
          res?.data?.canonicalRegistration ||
          merged?.registrationNumber ||
          "";

        if (merged) {
          applyVehicleToForm(merged);
        }
        if (canonicalRegistration) {
          setFormData((prev) => ({
            ...prev,
            registrationAllotted: "Yes",
            registrationNumber: String(canonicalRegistration).toUpperCase(),
          }));
        }
        setVehiclePotentialMatch(null);
        setVehiclePotentialMatches([]);
        message.success("Vehicle history merged successfully");
      } catch (err) {
        console.error("[Insurance][VehicleMerge] error:", err);
        message.error(err?.message || "Failed to merge vehicle history");
      } finally {
        setVehicleMergeLoading(false);
      }
    },
    [
      applyVehicleToForm,
      formData.chassisNumber,
      formData.companyName,
      formData.cubicCapacity,
      formData.customerName,
      formData.dateOfReg,
      formData.engineNumber,
      formData.fuelType,
      formData.hypothecation,
      formData.manufactureMonth,
      formData.manufactureYear,
      formData.mobile,
      formData.regAuthority,
      formData.registrationNumber,
      formData.typesOfVehicle,
      formData.vehicleMake,
      formData.vehicleModel,
      formData.vehicleVariant,
      formData.batteryNumber,
      formData.chargerNumber,
      insuranceDbId,
      vehiclePotentialMatch,
    ],
  );

  useEffect(() => {
    if (step !== 4) {
      setPlanFeaturesModal({ open: false, row: null });
    }
  }, [step]);

  useEffect(() => {
    if (!initialValues) {
      if (isCreateMode) {
        if (freshDraft) {
          clearInsuranceDraftFromSession();
        }

        const savedDraft = freshDraft ? null : loadInsuranceDraftFromSession();
        if (savedDraft && savedDraft.formData) {
          setFormData({ ...initialFormState, ...savedDraft.formData });
          setQuotes(savedDraft.quotes || []);
          setAcceptedQuoteId(savedDraft.acceptedQuoteId || null);
          setQuoteDraft({
            ...initialQuoteDraft,
            ...(savedDraft.quoteDraft || {}),
            addOns: {
              ...initialQuoteDraft.addOns,
              ...(savedDraft.quoteDraft?.addOns || {}),
            },
          });
          setDocuments(savedDraft.documents || []);
          setPaymentHistory(savedDraft.paymentHistory || []);
          setInsuranceDbId(savedDraft.insuranceDbId || null);
          setStep(savedDraft.step || 1);
          setSubmitted(false);
          setCaseReference("");
          setShowErrors(false);
          message.success("Restored unsaved insurance draft.");
          return;
        }
      }

      setFormData({ ...initialFormState });
      setQuotes([]);
      setAcceptedQuoteId(null);
      setQuoteDraft({
        ...initialQuoteDraft,
        addOns: { ...initialQuoteDraft.addOns },
      });
      setDocuments([]);
      setPaymentHistory([]);
      setInsuranceDbId(null);
      setSubmitted(false);
      setCaseReference("");
      setShowErrors(false);
      return;
    }
    const derivedSource = String(
      initialValues?.source ||
        initialValues?.sourceOrigin ||
        initialValues?.recordSource ||
        "Direct",
    ).trim();
    const mergedValues = normalizeFormDates({
      ...initialFormState,
      ...(initialValues || {}),
      policyCategory:
        initialValues?.policyCategory ||
        initialValues?.policyTypeSelector ||
        initialFormState.policyCategory ||
        "Insurance Policy",
      source: derivedSource || "Direct",
      sourceOrigin: derivedSource || "Direct",
      sourceName:
        initialValues?.sourceName ||
        initialValues?.channelName ||
        initialValues?.referenceName ||
        initialFormState.sourceName,
      previousPolicyType:
        normalizePolicyTypeLabel(
          initialValues?.previousPolicyType ||
            initialValues?.previous_policy_type ||
            "",
        ) || initialFormState.previousPolicyType,
      newPolicyType:
        normalizePolicyTypeLabel(
          initialValues?.newPolicyType ||
            initialValues?.coverageType ||
            initialValues?.new_policy_type ||
            "",
        ) || initialFormState.newPolicyType,
      dealerChannelName:
        initialValues?.dealerChannelName ||
        initialValues?.dealer_channel_name ||
        initialFormState.dealerChannelName,
      dealerChannelAddress:
        initialValues?.dealerChannelAddress ||
        initialValues?.dealer_channel_address ||
        initialFormState.dealerChannelAddress,
      dealerMobile:
        initialValues?.dealerMobile ||
        initialValues?.dealer_mobile ||
        initialFormState.dealerMobile,
      payoutApplicable:
        initialValues?.payoutApplicable ||
        initialFormState.payoutApplicable ||
        "No",
      payoutPercent:
        initialValues?.payoutPercent ??
        initialValues?.payoutPercentage ??
        initialFormState.payoutPercent,
      payoutPercentage:
        initialValues?.payoutPercent ??
        initialValues?.payoutPercentage ??
        initialFormState.payoutPercentage,
      assignedTo:
        initialValues?.assignedTo ||
        initialValues?.employeeUserId ||
        initialFormState.assignedTo,
      registrationAllotted:
        initialValues?.registrationAllotted ||
        (String(initialValues?.registrationNumber || "")
          .trim()
          .toUpperCase()
          .startsWith("TEMP_REDG_")
          ? "No"
          : initialFormState.registrationAllotted || "Yes"),
      nomineeDob: initialValues?.nomineeDob || initialFormState.nomineeDob,
      nomineeAge:
        initialValues?.nomineeAge ||
        getAgeFromDob(initialValues?.nomineeDob) ||
        initialFormState.nomineeAge,
      customerPaymentExpected:
        initialValues?.customerPaymentExpected ??
        initialValues?.customer_payment_expected ??
        initialFormState.customerPaymentExpected,
      customerPaymentReceived:
        initialValues?.customerPaymentReceived ??
        initialValues?.customer_payment_received ??
        initialFormState.customerPaymentReceived,
      inhousePaymentExpected:
        initialValues?.inhousePaymentExpected ??
        initialValues?.inhouse_payment_expected ??
        initialFormState.inhousePaymentExpected,
      inhousePaymentReceived:
        initialValues?.inhousePaymentReceived ??
        initialValues?.inhouse_payment_received ??
        initialFormState.inhousePaymentReceived,
    });
    setFormData(mergedValues);
    const normalizedQuotes = normalizeQuotesFromApi(initialValues?.quotes);
    if (normalizedQuotes.length) {
      setQuotes(normalizedQuotes);
      const accId = initialValues.acceptedQuoteId;
      const picked =
        normalizedQuotes.find(
          (q) =>
            accId !== undefined &&
            accId !== null &&
            String(getQuoteRowId(q)) === String(accId),
        ) ||
        normalizedQuotes.find((q) => q.isAccepted) ||
        normalizedQuotes[0];
      setQuoteDraft(mapQuoteToDraft(picked));
      const resolvedAcceptedId =
        initialValues?.acceptedQuoteId ??
        (picked ? getQuoteRowId(picked) : null);
      setAcceptedQuoteId(
        resolvedAcceptedId !== undefined && resolvedAcceptedId !== null
          ? String(resolvedAcceptedId)
          : null,
      );
    } else {
      setQuotes([]);
      setQuoteDraft({
        ...initialQuoteDraft,
        addOns: { ...initialQuoteDraft.addOns },
      });
    }
    if (Array.isArray(initialValues?.documents))
      setDocuments(initialValues.documents);
    else if (Array.isArray(initialValues?.document_library))
      setDocuments(initialValues.document_library);
    else setDocuments([]);

    if (Array.isArray(initialValues?.paymentHistory))
      setPaymentHistory(initialValues.paymentHistory);
    else if (Array.isArray(initialValues?.payment_history))
      setPaymentHistory(initialValues.payment_history);
    else setPaymentHistory([]);

    if (
      initialValues?.acceptedQuoteId === undefined &&
      !normalizedQuotes.length
    ) {
      setAcceptedQuoteId(null);
    }
    if (initialValues?.currentStep)
      setStep(Number(initialValues.currentStep || 1));
    setInsuranceDbId(initialValues?._id || initialValues?.id || null);
  }, [initialValues, normalizeFormDates]);

  useEffect(() => {
    const derivedAge = getAgeFromDob(formData.nomineeDob);
    if (String(formData.nomineeAge || "") === String(derivedAge || "")) return;
    setFormData((prev) => ({
      ...prev,
      nomineeAge: derivedAge || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nomineeDob]);

  useEffect(() => {
    const prevRemarks = String(formData.previousRemarks || "").trim();
    const newRemarks = String(formData.newRemarks || "").trim();
    if (!prevRemarks || newRemarks) return;
    setFormData((prev) => {
      const prevText = String(prev.previousRemarks || "").trim();
      const newText = String(prev.newRemarks || "").trim();
      if (!prevText || newText) return prev;
      return {
        ...prev,
        newRemarks: prev.previousRemarks,
      };
    });
  }, [formData.newRemarks, formData.previousRemarks]);

  useEffect(() => {
    const pin = normalizePincode(formData.pincode);
    if (!pin) {
      setCityLookupLoading(false);
      return;
    }
    const reqId = ++cityLookupSeqRef.current;
    let cancelled = false;

    (async () => {
      setCityLookupLoading(true);
      try {
        const city = await lookupCityByPincode(pin);
        if (cancelled || reqId !== cityLookupSeqRef.current) return;
        if (!city) return;
        setFormData((prev) => {
          if (normalizePincode(prev.pincode) !== pin) return prev;
          if (String(prev.city || "").trim() === String(city || "").trim())
            return prev;
          return { ...prev, city };
        });
      } catch {
        // no-op
      } finally {
        if (!cancelled && reqId === cityLookupSeqRef.current) {
          setCityLookupLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.pincode]);

  useEffect(() => {
    if (
      !isNewCar &&
      String(formData.registrationAllotted || "").trim() !== "Yes"
    ) {
      setFormData((prev) => ({ ...prev, registrationAllotted: "Yes" }));
    }
  }, [formData.registrationAllotted, isNewCar]);

  const shouldSkipStep = useCallback(
    (stepNumber) => {
      if (
        (isNewCar ||
          isExtendedWarranty ||
          shouldSkipPreviousPolicyForUsedCar) &&
        stepNumber === 3
      ) {
        return true;
      }
      if (isExtendedWarranty && stepNumber === 4) return true;
      if (stepNumber === 5) return true; // Premium Breakup removed from flow
      return false;
    },
    [isExtendedWarranty, isNewCar, shouldSkipPreviousPolicyForUsedCar],
  );
  const step1Errors = useMemo(() => validateStep1Minimal(formData), [formData]);
  const step1StrictErrors = useMemo(
    () => validateStep1Strict(formData),
    [formData],
  );
  const step1DisplayErrors = useMemo(
    () => ({
      ...step1Errors,
      ...(showErrors ? step1StrictErrors : {}),
    }),
    [step1Errors, step1StrictErrors, showErrors],
  );
  const step2Errors = useMemo(() => validateStep2(formData), [formData]);
  const step3Errors = useMemo(() => validateStep3(formData), [formData]);
  const acceptedQuote =
    quotes.find(
      (q) => String(getQuoteRowId(q)) === String(acceptedQuoteId ?? ""),
    ) || null;
  const acceptedQuoteBreakup = useMemo(
    () => (acceptedQuote ? computeQuoteBreakupFromRow(acceptedQuote) : null),
    [acceptedQuote, computeQuoteBreakupFromRow],
  );
  const docsTaggedCount = documents.filter((d) => d.tag).length;
  const allUploadedDocsTagged =
    documents.length > 0 && docsTaggedCount === documents.length;
  const finalSubmitErrors = useMemo(() => {
    const errors = [];
    if (Object.keys(step1StrictErrors).length) {
      const detail = summarizeFieldErrors(step1StrictErrors);
      errors.push(
        detail
          ? `Step 1 (Customer info) — ${detail}`
          : "Case details are incomplete.",
      );
    }
    if (Object.keys(step2Errors).length) {
      const detail = summarizeFieldErrors(step2Errors);
      errors.push(
        detail
          ? `Step 2 (Vehicle) — ${detail}`
          : "Vehicle details are incomplete.",
      );
    }
    if (!shouldSkipStep(3) && Object.keys(step3Errors).length) {
      const detail = summarizeFieldErrors(step3Errors);
      errors.push(
        detail
          ? `Step 3 (Previous policy) — ${detail}`
          : "Previous policy details are incomplete.",
      );
    }
    if (!shouldSkipStep(4) && quotes.length === 0)
      errors.push("At least one quote is required.");
    if (!shouldSkipStep(4) && !acceptedQuoteId)
      errors.push("Accept one quote before submitting.");
    if (!String(formData.newInsuranceCompany || "").trim())
      errors.push("New insurance company is required.");
    if (!String(formData.newPolicyType || "").trim())
      errors.push("New policy type is required.");
    if (!String(formData.newPolicyNumber || "").trim())
      errors.push("New policy number is required.");
    if (!String(formData.newIssueDate || "").trim())
      errors.push("New policy issue date is required.");
    if (!String(formData.newPolicyStartDate || "").trim())
      errors.push("New policy start date is required.");

    return errors;
  }, [
    acceptedQuoteId,
    formData,
    quotes.length,
    shouldSkipStep,
    step1StrictErrors,
    step2Errors,
    step3Errors,
  ]);

  useEffect(() => {
    if (shouldSkipStep(3) && step === 3) {
      setStep(4);
    }
  }, [shouldSkipStep, step]);

  useEffect(() => {
    if (isExtendedWarranty && step === 4) {
      setStep(6);
    }
  }, [isExtendedWarranty, step]);

  useEffect(() => {
    if (step === 5) {
      setStep(6);
    }
  }, [step]);

  const quoteComputed = useMemo(() => {
    const coverageType = String(quoteDraft.coverageType || "Comprehensive");
    const isThirdPartyOnly = coverageType === "Third Party";
    const isOdOnly =
      coverageType === "Own Damage" || coverageType === "Stand Alone OD";
    const includesOd = !isThirdPartyOnly;
    const includesTp = !isOdOnly;
    const allowsAddOns = includesOd;
    const selectedAddOnsTotal = addOnCatalog.reduce((sum, name) => {
      if (!quoteDraft.addOnsIncluded?.[name]) return sum;
      return sum + Number(quoteDraft.addOns?.[name] || 0);
    }, 0);
    const hasAnySelectedAddOn = addOnCatalog.some((name) =>
      Boolean(quoteDraft.addOnsIncluded?.[name]),
    );
    const flatAddOnsAmount = Number(quoteDraft.addOnsAmount || 0);
    const hasFlatOverride =
      flatAddOnsAmount > 0 &&
      hasAnySelectedAddOn &&
      Math.round(flatAddOnsAmount) !== Math.round(selectedAddOnsTotal);
    const rawAddOnsTotal = allowsAddOns
      ? hasAnySelectedAddOn
        ? hasFlatOverride
          ? flatAddOnsAmount
          : selectedAddOnsTotal
        : flatAddOnsAmount
      : 0;

    const addOnsTotal = rawAddOnsTotal;
    const addOnsSource = !allowsAddOns
      ? "none"
      : hasAnySelectedAddOn
        ? hasFlatOverride
          ? "flat_override"
          : "selected"
        : "flat";
    const odAmt = includesOd ? Number(quoteDraft.odAmount || 0) : 0;
    const tpAmt = includesTp ? Number(quoteDraft.thirdPartyAmount || 0) : 0;
    const totalIdv =
      Number(quoteDraft.vehicleIdv || 0) +
      Number(quoteDraft.cngIdv || 0) +
      Number(quoteDraft.accessoriesIdv || 0);

    const ncbPct = Number(quoteDraft.ncbDiscount || 0);
    const ncbReferenceAmount = Math.round((odAmt * ncbPct) / 100);
    const basePremium = odAmt + tpAmt + addOnsTotal;
    const payoutBaseAmount = computePayoutBaseAmount(
      odAmt,
      addOnsTotal,
      quoteDraft.insuranceCompany,
    );
    const taxableAmount = Math.max(basePremium, 0);
    const gstAmount = Math.round(taxableAmount * 0.18);
    const totalPremium = taxableAmount + gstAmount;
    return {
      selectedAddOnsTotal,
      addOnsTotal,
      addOnsSource,
      odAmt,
      tpAmt,
      totalIdv,
      basePremium,
      ncbReferenceAmount,
      ncbPct,
      taxableAmount,
      gstAmount,
      totalPremium,
      payoutBaseAmount,
    };
  }, [quoteDraft]);

  useEffect(() => {
    setQuoteDraft((prev) => {
      if (editingQuoteId) return prev;
      const nextDuration = getDefaultStep4PolicyDuration({
        coverageType: prev.coverageType || "Comprehensive",
        isNewCar,
      });
      const currentDuration = String(prev.policyDuration || "").trim();
      const durationOptionsForCurrent = getStep4DurationOptions({
        coverageType: prev.coverageType || "Comprehensive",
        isNewCar,
      });
      const resolvedDuration = durationOptionsForCurrent.includes(
        currentDuration,
      )
        ? currentDuration
        : nextDuration;
      const nextNcb = Number(step4SuggestedNcb || 0);
      const shouldSyncNcb =
        !String(prev.insuranceCompany || "").trim() &&
        Number(prev.odAmount || 0) === 0 &&
        Number(prev.thirdPartyAmount || 0) === 0 &&
        !addOnCatalog.some((name) => Boolean(prev.addOnsIncluded?.[name]));
      const previousHypothecation = String(
        formData.previousHypothecation || "Not Applicable",
      ).trim();
      const currentHypothecation = String(
        prev.hypothecation || "Not Applicable",
      ).trim();
      const shouldSyncHypothecation =
        !String(prev.insuranceCompany || "").trim() &&
        Number(prev.odAmount || 0) === 0 &&
        Number(prev.thirdPartyAmount || 0) === 0 &&
        !addOnCatalog.some((name) => Boolean(prev.addOnsIncluded?.[name])) &&
        (!currentHypothecation ||
          currentHypothecation.toLowerCase() === "not applicable");

      if (
        resolvedDuration === currentDuration &&
        (!shouldSyncNcb || Number(prev.ncbDiscount || 0) === nextNcb) &&
        (!shouldSyncHypothecation ||
          currentHypothecation === previousHypothecation)
      ) {
        return prev;
      }

      return {
        ...prev,
        policyDuration: resolvedDuration,
        ...(shouldSyncNcb ? { ncbDiscount: nextNcb } : {}),
        ...(shouldSyncHypothecation
          ? { hypothecation: previousHypothecation || "Not Applicable" }
          : {}),
      };
    });
  }, [
    editingQuoteId,
    formData.previousHypothecation,
    isNewCar,
    step4SuggestedNcb,
  ]);

  const handleChange = (field) => (event) => {
    const nextValue = event?.target?.value;
    setFormData((prev) => {
      if (field === "previousRemarks") {
        const oldPreviousRemarks = String(prev.previousRemarks || "");
        const currentNewRemarks = String(prev.newRemarks || "");
        const shouldSyncToNew =
          !currentNewRemarks.trim() ||
          currentNewRemarks.trim() === oldPreviousRemarks.trim();
        return {
          ...prev,
          previousRemarks: nextValue,
          ...(shouldSyncToNew ? { newRemarks: nextValue } : {}),
        };
      }
      return { ...prev, [field]: nextValue };
    });
    schedulePersist();
  };

  const buildPersistPayload = useCallback(
    (patch = {}) => {
      const { _id, __v, id, createdAt, updatedAt, ...safeFormData } =
        formData || {};
      const safePatch = { ...(patch || {}) };
      delete safePatch._id;
      delete safePatch.__v;
      delete safePatch.id;
      delete safePatch.createdAt;
      delete safePatch.updatedAt;

      const normalizedSource =
        String(
          safeFormData.source || safeFormData.sourceOrigin || "Direct",
        ).trim() || "Direct";
      const normalizedPaymentHistory =
        normalizePaymentHistoryForPersist(paymentHistory);
      const customerPaymentExpected = Number(
        safeFormData.customerPaymentExpected || 0,
      );
      const customerPaymentReceived = Number(
        safeFormData.customerPaymentReceived || 0,
      );
      const inhousePaymentExpected = Number(
        safeFormData.inhousePaymentExpected || 0,
      );
      const inhousePaymentReceived = Number(
        safeFormData.inhousePaymentReceived || 0,
      );

      // Naming Logic
      const customerName = (
        safeFormData.customerName ||
        safeFormData.companyName ||
        "New Customer"
      ).trim();
      const vehicleIdent =
        safeFormData.registrationNumber ||
        `${safeFormData.vehicleMake || ""} ${safeFormData.vehicleModel || ""} ${safeFormData.vehicleVariant || ""}`.trim() ||
        "Unknown Vehicle";

      const startYear = safeFormData.newPolicyStartDate
        ? dayjs(safeFormData.newPolicyStartDate).year()
        : safeFormData.previousPolicyStartDate
          ? dayjs(safeFormData.previousPolicyStartDate).year()
          : "";
      const endYear = safeFormData.newOdExpiryDate
        ? dayjs(safeFormData.newOdExpiryDate).year()
        : "";
      const yearRange =
        startYear && endYear
          ? `${startYear} - ${endYear}`
          : startYear
            ? `${startYear}`
            : "";

      const policyName =
        `${customerName} ${vehicleIdent} ${yearRange ? `* ${yearRange}` : ""}`.trim();
      const payoutPercentValue = Number(
        safeFormData.payoutPercent ?? safeFormData.payoutPercentage ?? 0,
      );

      const mobileNorm = normalizeIndianMobile(safeFormData.mobile);
      const altNorm = normalizeIndianMobile(safeFormData.alternatePhone);
      const refNorm = normalizeIndianMobile(safeFormData.referencePhone);

      return {
        ...safeFormData,
        mobile: mobileNorm.length === 10 ? mobileNorm : safeFormData.mobile,
        alternatePhone:
          altNorm.length === 10
            ? altNorm
            : String(safeFormData.alternatePhone || "").trim() || "",
        referencePhone:
          refNorm.length === 10
            ? refNorm
            : String(safeFormData.referencePhone || "").trim() || "",
        source: normalizedSource,
        sourceOrigin: normalizedSource,
        policyCategory: safeFormData.policyCategory || "Insurance Policy",
        policyTypeSelector: safeFormData.policyCategory || "Insurance Policy",
        quotes,
        acceptedQuoteId,
        documents,
        paymentHistory: normalizedPaymentHistory,
        customerPaymentExpected,
        customerPaymentReceived,
        inhousePaymentExpected,
        inhousePaymentReceived,
        assignedTo: String(
          safeFormData.assignedTo || safeFormData.employeeUserId || "",
        ).trim(),
        status: safePatch.status || "draft",
        currentStep: step,
        policyName,
        payoutPercent: Number.isFinite(payoutPercentValue)
          ? payoutPercentValue
          : 0,
        ...safePatch,
      };
    },
    [acceptedQuoteId, documents, formData, paymentHistory, quotes, step],
  );

  const persistNow = useCallback(
    async ({ silent = true, patch = {} } = {}) => {
      const run = async () => {
        setSaving(true);
        setSaveError("");

        try {
          const payload = buildPersistPayload(patch);
          if (!insuranceDbId) {
            const hasName = Boolean(
              String(
                payload?.customerName || payload?.companyName || "",
              ).trim(),
            );
            const mobile = normalizeIndianMobile(payload?.mobile);
            if (!hasName || mobile.length !== 10) {
              const errorText =
                "Customer/company name and valid 10-digit mobile are required to create insurance case.";
              setSaveError(errorText);
              if (!silent) message.error(errorText);
              return null;
            }
          }
          if (!insuranceDbId) {
            const res = await insuranceApi.create(payload);
            const created = res?.data || res;
            const id = created?._id || created?.id || created?.data?._id;
            if (id) setInsuranceDbId(id);
            setLastSavedAt(new Date().toISOString());
            // Mark form as clean relative to this save point
            savedSnapshotRef.current = currentSnapshotRef.current;
            if (!silent) message.success("Draft saved ✓");
            return created;
          }
          const res = await insuranceApi.update(insuranceDbId, payload);
          setLastSavedAt(new Date().toISOString());
          // Mark form as clean relative to this save point
          savedSnapshotRef.current = currentSnapshotRef.current;
          if (!silent) message.success("Draft saved ✓");
          return res?.data || res;
        } catch (err) {
          console.error("[Insurance] Persist failed:", err);
          setSaveError(err?.message || "Save failed");
          if (!silent) {
            message.error(err?.message || "Failed to autosave insurance case");
          }
          return null;
        } finally {
          setSaving(false);
        }
      };

      const next = persistChainRef.current.then(run);
      persistChainRef.current = next.catch(() => {});
      return next;
    },
    [buildPersistPayload, insuranceDbId],
  );

  const schedulePersist = useCallback(
    (ms = 700) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistNow({ silent: true });
      }, ms);
    },
    [persistNow],
  );

  const savePaymentEntry = useCallback(
    async (entry = {}) => {
      const idempotencyKey =
        String(entry?.idempotencyKey || "").trim() ||
        `ins-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload = { ...entry, idempotencyKey };

      let caseId = insuranceDbId;
      if (!caseId) {
        const created = await persistNow({ silent: true });
        caseId =
          created?._id || created?.id || created?.data?._id || insuranceDbId;
      }

      if (!caseId) {
        schedulePersist(220);
        return { persisted: false, fallback: true };
      }

      try {
        const res = await insuranceApi.appendPayment(caseId, payload, {
          idempotencyKey,
        });
        const responseData = res?.data || res || {};
        const maybeHistory =
          (Array.isArray(responseData?.paymentHistory) &&
            responseData.paymentHistory) ||
          (Array.isArray(responseData?.payment_history) &&
            responseData.payment_history) ||
          (Array.isArray(responseData?.data?.paymentHistory) &&
            responseData.data.paymentHistory) ||
          (Array.isArray(responseData?.data?.payment_history) &&
            responseData.data.payment_history) ||
          null;

        const maybeEntry =
          responseData?.payment ||
          responseData?.entry ||
          responseData?.data?.payment ||
          responseData?.data?.entry ||
          null;

        if (maybeHistory) {
          setPaymentHistory(maybeHistory);
        } else if (maybeEntry) {
          setPaymentHistory((prev) => {
            const rows = Array.isArray(prev) ? prev : [];
            const matchIndex = rows.findIndex((row) => {
              const rowKey = String(
                row?.idempotencyKey || row?._id || row?.id || "",
              ).trim();
              const incomingKey = String(
                maybeEntry?.idempotencyKey ||
                  maybeEntry?._id ||
                  maybeEntry?.id ||
                  "",
              ).trim();
              return rowKey && incomingKey && rowKey === incomingKey;
            });
            if (matchIndex === -1) return [...rows, maybeEntry];
            return rows.map((row, idx) =>
              idx === matchIndex ? maybeEntry : row,
            );
          });
        }

        setLastSavedAt(new Date().toISOString());
        setSaveError("");
        return { persisted: true };
      } catch (err) {
        if (Number(err?.status) === 404 || Number(err?.status) === 405) {
          // Backend endpoint may not be deployed yet; fallback to full draft persist.
          schedulePersist(220);
          return { persisted: false, fallback: true };
        }
        setSaveError(err?.message || "Payment save failed");
        throw err;
      }
    },
    [insuranceDbId, persistNow, schedulePersist],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const setField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    schedulePersist();
  }, [schedulePersist]);

  const draftSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        formData,
        quoteDraft,
        acceptedQuoteId,
        documents,
        paymentHistory,
        insuranceDbId,
        step,
      }),
    [
      formData,
      quoteDraft,
      acceptedQuoteId,
      documents,
      paymentHistory,
      insuranceDbId,
      step,
    ],
  );

  React.useEffect(() => {
    currentDraftRef.current = {
      formData,
      quoteDraft,
      acceptedQuoteId,
      documents,
      paymentHistory,
      insuranceDbId,
      step,
    };
  }, [
    formData,
    quoteDraft,
    acceptedQuoteId,
    documents,
    paymentHistory,
    insuranceDbId,
    step,
  ]);

  React.useEffect(() => {
    if (!isCreateMode || initialValues) return;
    if (draftSnapshot === lastSavedDraftSnapshotRef.current) return;
    if (autoSaveDraftTimerRef.current) {
      window.clearTimeout(autoSaveDraftTimerRef.current);
    }

    autoSaveDraftTimerRef.current = window.setTimeout(() => {
      const draft = {
        ...currentDraftRef.current,
        timestamp: new Date().toISOString(),
      };
      saveInsuranceDraftToSession(draft);
      lastSavedDraftSnapshotRef.current = draftSnapshot;
    }, 700);

    return () => {
      if (autoSaveDraftTimerRef.current) {
        window.clearTimeout(autoSaveDraftTimerRef.current);
      }
    };
  }, [isCreateMode, initialValues, draftSnapshot]);

  React.useEffect(() => {
    return () => {
      if (!isCreateMode || initialValues) return;
      if (autoSaveDraftTimerRef.current) {
        window.clearTimeout(autoSaveDraftTimerRef.current);
      }
      const draft = {
        ...currentDraftRef.current,
        timestamp: new Date().toISOString(),
      };
      saveInsuranceDraftToSession(draft);
    };
  }, [isCreateMode, initialValues]);

  const handlePolicyDoneByChange = useCallback((value) => {
    setFormData((prev) => {
      const next = { ...prev, policyDoneBy: value || "Autocredits India LLP" };
      if (value === "Broker") next.showroomName = "";
      if (value === "Showroom") next.brokerName = "";
      if (value === "Autocredits India LLP" || value === "Customer") {
        next.brokerName = "";
        next.showroomName = "";
        next.channelDealerNo = "";
      }
      return next;
    });
  }, []);

  const handleSourceChange = useCallback((value) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        source: value || "Direct",
        sourceOrigin: value || "Direct",
      };
      if (value === "Direct") {
        next.dealerChannelName = "";
        next.dealerChannelAddress = "";
        next.dealerMobile = "";
        next.payoutApplicable = "No";
        next.payoutPercent = "";
        if (
          String(next.policyDoneBy || "")
            .trim()
            .toLowerCase() !== "broker" &&
          String(next.policyDoneBy || "")
            .trim()
            .toLowerCase() !== "showroom"
        ) {
          next.channelDealerNo = "";
        }
      } else if (value === "Indirect") {
        next.sourceName = "";
        if (!next.payoutApplicable) next.payoutApplicable = "No";
      }
      return next;
    });
  }, []);

  const handleStepValidation = useCallback(() => {
    if (step === 1) return Object.keys(step1Errors).length === 0;
    if (step === 2) return Object.keys(step2Errors).length === 0;
    if (step === 3 && !shouldSkipStep(3))
      return Object.keys(step3Errors).length === 0;
    if (step === 4 && !shouldSkipStep(4))
      return quotes.length > 0 && Boolean(acceptedQuoteId);
    if (step === 6) {
      return (
        Boolean(String(formData.newInsuranceCompany || "").trim()) &&
        Boolean(String(formData.newPolicyType || "").trim()) &&
        Boolean(String(formData.newPolicyNumber || "").trim()) &&
        Boolean(String(formData.newIssueDate || "").trim()) &&
        Boolean(String(formData.newPolicyStartDate || "").trim())
      );
    }
    return true;
  }, [
    step,
    step1Errors,
    step2Errors,
    step3Errors,
    shouldSkipStep,
    quotes,
    acceptedQuoteId,
    formData.newInsuranceCompany,
    formData.newPolicyType,
    formData.newPolicyNumber,
    formData.newIssueDate,
    formData.newPolicyStartDate,
  ]);

  const handleDelete = async () => {
    if (!insuranceDbId) {
      message.warning("Cannot delete an unsaved case");
      return;
    }

    setDeleting(true);
    try {
      await insuranceApi.delete(insuranceDbId);
      message.success("Insurance case deleted successfully");
      onDelete?.();
      onCancel();
    } catch (err) {
      console.error("[Insurance] Delete failed:", err);
      message.error(err?.message || "Failed to delete case");
    } finally {
      setDeleting(false);
    }
  };

  const getNextVisibleStep = useCallback(
    (fromStep) => {
      let next = Math.min(fromStep + 1, 9);
      while (next < 9 && shouldSkipStep(next)) next += 1;
      return next;
    },
    [shouldSkipStep],
  );

  const navigateToStep = useCallback(
    async (targetStep) => {
      const nextStep = Number(targetStep || step);
      if (!Number.isFinite(nextStep) || nextStep === step) return true;

      const movingForward = nextStep > step;
      if (movingForward) {
        setShowErrors(true);
        if (!handleStepValidation()) return false;
        if (step === 1 && !(await confirmCrmCustomerChanges())) return false;
      }

      const saved = await persistNow({ silent: true });
      if (movingForward && !saved) return false;

      setStep(nextStep);
      setShowErrors(false);
      return true;
    },
    [confirmCrmCustomerChanges, handleStepValidation, persistNow, step],
  );

  const goNext = useCallback(async () => {
    await navigateToStep(getNextVisibleStep(step));
  }, [getNextVisibleStep, navigateToStep, step]);

  const handleClearForm = () => {
    const clearCurrentStep = () => {
      if (step === 1) {
        setFormData((prev) => ({
          ...prev,
          customerName: initialFormState.customerName,
          companyName: initialFormState.companyName,
          contactPersonName: initialFormState.contactPersonName,
          mobile: initialFormState.mobile,
          alternatePhone: initialFormState.alternatePhone,
          email: initialFormState.email,
          gender: initialFormState.gender,
          panNumber: initialFormState.panNumber,
          aadhaarNumber: initialFormState.aadhaarNumber,
          gstNumber: initialFormState.gstNumber,
          residenceAddress: initialFormState.residenceAddress,
          pincode: initialFormState.pincode,
          city: initialFormState.city,
          nomineeName: initialFormState.nomineeName,
          nomineeRelationship: initialFormState.nomineeRelationship,
          nomineeDob: initialFormState.nomineeDob,
          nomineeAge: initialFormState.nomineeAge,
          referenceName: initialFormState.referenceName,
          referencePhone: initialFormState.referencePhone,
        }));
      } else if (step === 2) {
        setFormData((prev) => ({
          ...prev,
          registrationAllotted: initialFormState.registrationAllotted,
          registrationNumber: initialFormState.registrationNumber,
          vehicleMake: initialFormState.vehicleMake,
          vehicleModel: initialFormState.vehicleModel,
          vehicleVariant: initialFormState.vehicleVariant,
          fuelType: initialFormState.fuelType,
          cubicCapacity: initialFormState.cubicCapacity,
          manufactureMonth: initialFormState.manufactureMonth,
          manufactureYear: initialFormState.manufactureYear,
          dateOfReg: initialFormState.dateOfReg,
          regAuthority: initialFormState.regAuthority,
          engineNumber: initialFormState.engineNumber,
          chassisNumber: initialFormState.chassisNumber,
          hypothecation: initialFormState.hypothecation,
          batteryNumber: initialFormState.batteryNumber,
          chargerNumber: initialFormState.chargerNumber,
        }));
      } else if (step === 3) {
        setFormData((prev) => ({
          ...prev,
          previousInsuranceCompany: initialFormState.previousInsuranceCompany,
          previousPolicyType: initialFormState.previousPolicyType,
          previousPolicyNumber: initialFormState.previousPolicyNumber,
          previousPolicyStartDate: initialFormState.previousPolicyStartDate,
          previousPolicyDuration: initialFormState.previousPolicyDuration,
          previousOdExpiryDate: initialFormState.previousOdExpiryDate,
          previousTpExpiryDate: initialFormState.previousTpExpiryDate,
          previousNcbDiscount: initialFormState.previousNcbDiscount,
          previousHypothecation: initialFormState.previousHypothecation,
          previousRemarks: initialFormState.previousRemarks,
          previousIdvAmount: initialFormState.previousIdvAmount,
          previousOwnDamageAmount: initialFormState.previousOwnDamageAmount,
          previousBasicOwnDamageAmount:
            initialFormState.previousBasicOwnDamageAmount,
          previousThirdPartyAmount: initialFormState.previousThirdPartyAmount,
          previousBasicThirdPartyAmount:
            initialFormState.previousBasicThirdPartyAmount,
          previousAddOnsTotal: initialFormState.previousAddOnsTotal,
          previousTotalPremium: initialFormState.previousTotalPremium,
          previousSelectedAddOns: initialFormState.previousSelectedAddOns,
          claimTakenLastYear: initialFormState.claimTakenLastYear,
        }));
      } else if (step === 4) {
        setQuotes([]);
        setAcceptedQuoteId(null);
        resetQuoteDraft();
      } else if (step === 6) {
        setFormData((prev) => ({
          ...prev,
          newInsuranceCompany: initialFormState.newInsuranceCompany,
          newPolicyType: initialFormState.newPolicyType,
          newPolicyNumber: initialFormState.newPolicyNumber,
          newIssueDate: initialFormState.newIssueDate,
          newPolicyStartDate: initialFormState.newPolicyStartDate,
          newInsuranceDuration: initialFormState.newInsuranceDuration,
          newOdExpiryDate: initialFormState.newOdExpiryDate,
          newTpExpiryDate: initialFormState.newTpExpiryDate,
          newNcbDiscount: initialFormState.newNcbDiscount,
          newRemarks: initialFormState.newRemarks,
          newIdvAmount: initialFormState.newIdvAmount,
          newOwnDamageAmount: initialFormState.newOwnDamageAmount,
          newBasicOwnDamageAmount: initialFormState.newBasicOwnDamageAmount,
          newThirdPartyAmount: initialFormState.newThirdPartyAmount,
          newBasicThirdPartyAmount: initialFormState.newBasicThirdPartyAmount,
          newAddOnsTotal: initialFormState.newAddOnsTotal,
          newTotalPremium: initialFormState.newTotalPremium,
          newSelectedAddOns: initialFormState.newSelectedAddOns,
        }));
      } else if (step === 7) {
        setDocuments([]);
      } else if (step === 8) {
        setPaymentHistory([]);
      } else if (step === 9) {
        setFormData((prev) => ({
          ...prev,
          payoutApplicable: initialFormState.payoutApplicable,
          payoutPercent: initialFormState.payoutPercent,
          payoutPercentage: initialFormState.payoutPercentage,
        }));
      }
      setShowErrors(false);
    };

    Modal.confirm({
      title: "Clear Form",
      content:
        "Are you sure you want to clear only the current step fields? This action cannot be undone.",
      okText: "Clear",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        clearCurrentStep();
        message.success("Current step cleared successfully.");
      },
    });
  };

  // Unified exit guard — shows the 3-option modal only when there are actual
  // unsaved changes.  When the form is clean, the action runs immediately.
  const handleRequestExit = React.useCallback(
    (afterAction = null) => {
      const doExit = afterAction ?? (() => onCancel?.());
      if (!isFormDirty) {
        doExit();
        return;
      }
      setUnsavedModal({ open: true, pendingAction: doExit });
    },
    [isFormDirty, onCancel],
  );

  // Discard: exit immediately without saving (resets dirty tracking first).
  const handleDiscard = React.useCallback(() => {
    savedSnapshotRef.current = currentSnapshotRef.current;
    onCancel?.();
  }, [onCancel]);

  // Exit: show the save/discard modal if there are unsaved changes.
  const handleSaveAndExit = () => handleRequestExit();

  keyboardActionsRef.current = {
    goNext,
    persistNow,
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      const isTypingContext =
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable ||
        target?.closest?.(".ant-select-dropdown") ||
        target?.closest?.(".ant-picker-dropdown");

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        keyboardActionsRef.current.persistNow?.({ silent: false });
        return;
      }

      if (isTypingContext) return;

      if (event.key === "Tab" && !event.shiftKey) {
        const wrapper = target?.closest?.("[data-ins-field='true']");
        const nextField = wrapper?.nextElementSibling?.querySelector?.(
          "input, textarea, button, [role='combobox'], .ant-select-selector, .ant-picker-input input",
        );
        if (nextField && typeof nextField.focus === "function") {
          requestAnimationFrame(() => nextField.focus());
        }
      }

      if (
        event.altKey &&
        (event.key === "ArrowRight" || event.key.toLowerCase() === "n")
      ) {
        event.preventDefault();
        keyboardActionsRef.current.goNext?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const handleSaveAndNewInsurance = async () => {
      const saved = await persistNow({ silent: false });
      if (!saved) return;
      navigate(`/insurance/new?fresh=${Date.now()}`);
    };

    window.addEventListener(
      "SAVE_AND_NEW_INSURANCE",
      handleSaveAndNewInsurance,
    );
    return () => {
      window.removeEventListener(
        "SAVE_AND_NEW_INSURANCE",
        handleSaveAndNewInsurance,
      );
    };
  }, [navigate, persistNow]);

  // Generic "save then navigate" event dispatched by the Header when the user
  // chooses "Save Changes" in the unsaved-changes modal.
  useEffect(() => {
    const handleSaveAndNavigate = async (event) => {
      const { targetPath, afterSave } = event?.detail || {};
      const saved = await persistNow({ silent: false });
      if (!saved) return;
      if (typeof afterSave === "function") {
        afterSave();
      } else if (targetPath) {
        navigate(targetPath);
      }
    };

    window.addEventListener("SAVE_AND_NAVIGATE_INSURANCE", handleSaveAndNavigate);
    return () => {
      window.removeEventListener("SAVE_AND_NAVIGATE_INSURANCE", handleSaveAndNavigate);
    };
  }, [navigate, persistNow]);

  const resetQuoteDraft = useCallback(() => {
    setQuoteDraft({
      ...initialQuoteDraft,
      policyDuration: getDefaultStep4PolicyDuration({
        coverageType: initialQuoteDraft.coverageType,
        isNewCar,
      }),
      ncbDiscount: Number(step4SuggestedNcb || 0),
      hypothecation: String(
        formData.previousHypothecation || "Not Applicable",
      ).trim(),
      addOns: { ...initialQuoteDraft.addOns },
      addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
    });
    setEditingQuoteId(null);
  }, [formData.previousHypothecation, isNewCar, step4SuggestedNcb]);

  const startEditQuote = useCallback(
    (quoteRow) => {
      if (!quoteRow) return;
      setEditingQuoteId(getQuoteRowId(quoteRow));
      setQuoteDraft(mapQuoteToDraft(quoteRow));
    },
    [setQuoteDraft],
  );

  const deleteQuote = useCallback(
    (id) => {
      const quoteId = String(id ?? "");
      let nextAcceptedId = acceptedQuoteId;
      setQuotes((prev) => {
        const filtered = (prev || []).filter(
          (q) => String(getQuoteRowId(q)) !== quoteId,
        );
        const acceptedStillExists = filtered.some(
          (q) => String(getQuoteRowId(q)) === String(nextAcceptedId ?? ""),
        );
        if (!acceptedStillExists) {
          nextAcceptedId = null;
        }
        return filtered;
      });
      setAcceptedQuoteId(nextAcceptedId);
      if (String(editingQuoteId ?? "") === quoteId) {
        resetQuoteDraft();
      }
    },
    [acceptedQuoteId, editingQuoteId, resetQuoteDraft],
  );

  const addQuote = () => {
    if (!quoteDraft.insuranceCompany.trim()) return;
    const normalizedQuotePayload = {
      ...quoteDraft,
      totalIdv: quoteComputed.totalIdv,
      addOnsTotal: quoteComputed.addOnsTotal,
      addOnsSource: quoteComputed.addOnsSource,
      taxableAmount: quoteComputed.taxableAmount,
      gstAmount: quoteComputed.gstAmount,
      totalPremium: quoteComputed.totalPremium,
      payoutPercentage: Number(quoteDraft.payoutPercentage || 0),
      payoutBaseAmount: quoteComputed.payoutBaseAmount,
    };

    const nextSignature = buildQuoteSignature(normalizedQuotePayload);
    const hasDuplicate = (quotes || []).some((existing) => {
      const existingId = String(getQuoteRowId(existing));
      if (editingQuoteId && existingId === String(editingQuoteId)) return false;
      return buildQuoteSignature(existing) === nextSignature;
    });
    if (hasDuplicate) {
      message.warning("Exact duplicate quote already exists.");
      return;
    }

    if (editingQuoteId) {
      setQuotes((prev) =>
        (prev || []).map((q) => {
          if (String(getQuoteRowId(q)) !== String(editingQuoteId)) return q;
          return {
            ...q,
            ...normalizedQuotePayload,
            id: getQuoteRowId(q),
          };
        }),
      );
      setEditingQuoteId(null);
      resetQuoteDraft();
      setShowErrors(false);
      return;
    }

    const newQuote = {
      id: Date.now(),
      ...normalizedQuotePayload,
      isAccepted: false,
    };
    setQuotes((prev) => [...prev, newQuote]);
    resetQuoteDraft();
    setShowErrors(false);
    schedulePersist(300);
  };

  const acceptQuote = async (id) => {
    const previousAcceptedId = acceptedQuoteId;
    setAcceptedQuoteId(id);
    setShowErrors(false);
    const q = quotes.find((x) => String(getQuoteRowId(x)) === String(id));
    if (!q) return;

    const policyStartDate =
      formData.newPolicyStartDate || new Date().toISOString().slice(0, 10);
    let selectedPayoutPercentage = DEFAULT_PAYOUT_PERCENTAGE;
    try {
      const payoutRateRes = await insuranceApi.getPayoutRate({
        companyName: q.insuranceCompany,
        onDate: policyStartDate,
      });
      const apiRate = Number(payoutRateRes?.data?.payoutPercentage);
      if (Number.isFinite(apiRate)) selectedPayoutPercentage = apiRate;
    } catch {
      selectedPayoutPercentage = DEFAULT_PAYOUT_PERCENTAGE;
    }

    Modal.confirm({
      title: "Set Payout %",
      content: (
        <div className="space-y-2">
          <p className="m-0 text-sm text-slate-600">
            Accepted quote: <b>{q.insuranceCompany || "Insurance Company"}</b>
          </p>
          <InputNumber
            min={0}
            max={100}
            defaultValue={selectedPayoutPercentage}
            addonAfter="%"
            className="w-full"
            onChange={(v) => {
              selectedPayoutPercentage = Number(v || 0);
            }}
          />
        </div>
      ),
      okText: "Apply",
      cancelText: "Cancel",
      onOk: () => {
        setFormData((prev) => {
          const breakup = computeQuoteBreakupFromRow(q);
          const payoutBaseAmount = Number(breakup?.payoutBaseAmount || 0);
          const payoutAmount =
            (payoutBaseAmount * Number(selectedPayoutPercentage || 0)) / 100;
          const nextReceivable = buildAutoReceivableRow(
            q.insuranceCompany,
            selectedPayoutPercentage,
            payoutAmount,
          );
          const existingReceivables = Array.isArray(prev.insurance_receivables)
            ? prev.insurance_receivables.filter((row) => !row?._autoGenerated)
            : [];
          const usedCarType = String(prev.usedCarFlowType || "Renewal").trim();
          const normalizeInsurer = (v) =>
            String(v || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
          const previousInsurer = normalizeInsurer(
            prev.previousInsuranceCompany,
          );
          const acceptedInsurer = normalizeInsurer(q.insuranceCompany);
          let policyJourneyClassification = String(
            prev.policyJourneyClassification || "",
          ).trim();
          const policyCategoryKey = String(
            prev.policyCategory || prev.policyTypeSelector || "",
          )
            .trim()
            .toLowerCase();
          const isExtendedWarranty =
            policyCategoryKey === "extended warranty" ||
            policyCategoryKey === "ew policy";

          if (
            String(prev.vehicleType || "").trim() === "Used Car" &&
            !isExtendedWarranty
          ) {
            if (usedCarType === "Renewal") {
              if (previousInsurer && acceptedInsurer) {
                policyJourneyClassification =
                  previousInsurer === acceptedInsurer ? "Renewal" : "Rollover";
              } else {
                policyJourneyClassification = "Renewal";
              }
            } else if (
              usedCarType === "Policy Already Expired" ||
              usedCarType === "Sale/Purchase"
            ) {
              policyJourneyClassification = usedCarType;
            }
          } else if (isExtendedWarranty) {
            policyJourneyClassification = "EW Policy";
          }

          return {
            ...prev,
            newInsuranceCompany: q.insuranceCompany,
            newPolicyType: normalizePolicyTypeLabel(q.coverageType),
            newInsuranceDuration: q.policyDuration,
            newIssueDate: "",
            newPolicyStartDate: "",
            newOdExpiryDate: "",
            newTpExpiryDate: "",
            newNcbDiscount: q.ncbDiscount,
            newVehicleIdv: Number(q.vehicleIdv || 0),
            newCngIdv: Number(q.cngIdv || 0),
            newAccessoriesIdv: Number(q.accessoriesIdv || 0),
            newIdvAmount: Number(
              q.totalIdv ||
                Number(q.vehicleIdv || 0) +
                  Number(q.cngIdv || 0) +
                  Number(q.accessoriesIdv || 0),
            ),
            newTotalPremium: Math.round(Number(breakup?.totalPremium || 0)),
            newHypothecation:
              String(q.hypothecation || "").trim() ||
              String(prev.previousHypothecation || "").trim() ||
              "Not Applicable",
            payoutPercentage: Number(selectedPayoutPercentage || 0),
            policyJourneyClassification,
            insurance_receivables: [...existingReceivables, nextReceivable],
          };
        });
      },
      onCancel: () => {
        setAcceptedQuoteId(previousAcceptedId ?? null);
      },
    });
  };

  const handlePreviousPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const policyType = next.previousPolicyType;
      const duration = next.previousPolicyDuration;
      const startDate = next.previousPolicyStartDate;

      if (policyType === "Comprehensive") {
        const y = yearsFromDuration(duration);
        next.previousOdExpiryDate = calcExpiryDate(startDate, y.odYears);
        next.previousTpExpiryDate = calcExpiryDate(startDate, y.tpYears);
      } else if (policyType === "Stand Alone OD") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.previousOdExpiryDate = calcExpiryDate(startDate, years);
        next.previousTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.previousTpExpiryDate = calcExpiryDate(startDate, years);
        next.previousOdExpiryDate = "";
      }

      return next;
    });
    schedulePersist();
  };

  const handleNewPolicyStartOrDuration = (updated) => {
    setFormData((prev) => {
      const next = { ...prev, ...updated };
      const policyType = next.newPolicyType;
      const duration = next.newInsuranceDuration;
      const startDate = next.newPolicyStartDate;

      if (policyType === "Comprehensive") {
        const y = yearsFromDuration(duration);
        next.newOdExpiryDate = calcExpiryDate(startDate, y.odYears);
        next.newTpExpiryDate = calcExpiryDate(startDate, y.tpYears);
      } else if (policyType === "Stand Alone OD") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.newOdExpiryDate = calcExpiryDate(startDate, years);
        next.newTpExpiryDate = "";
      } else if (policyType === "Third Party") {
        const years =
          duration === "1 Year"
            ? 1
            : duration === "2 Years"
              ? 2
              : duration === "3 Years"
                ? 3
                : 0;
        next.newTpExpiryDate = calcExpiryDate(startDate, years);
        next.newOdExpiryDate = "";
      }

      return next;
    });
    schedulePersist();
  };

  const handleSubmitFinal = async (event) => {
    event.preventDefault();
    const lastStep = visibleSteps[visibleSteps.length - 1]?.originalStep;
    if (step !== lastStep) return;
    if (finalSubmitErrors.length) {
      setShowErrors(true);
      if (Object.keys(step1StrictErrors).length) setStep(1);
      else if (Object.keys(step2Errors).length) setStep(2);
      else if (!shouldSkipStep(3) && Object.keys(step3Errors).length)
        setStep(3);
      else if (!shouldSkipStep(4) && (!quotes.length || !acceptedQuoteId)) {
        setStep(shouldSkipStep(4) ? 6 : 4);
      } else if (
        !String(formData.newInsuranceCompany || "").trim() ||
        !String(formData.newPolicyType || "").trim() ||
        !String(formData.newPolicyNumber || "").trim() ||
        !String(formData.newIssueDate || "").trim() ||
        !String(formData.newPolicyStartDate || "").trim()
      ) {
        setStep(6);
      }
      message.error(finalSubmitErrors[0], 8);
      return;
    }
    if (!(await confirmCrmCustomerChanges())) return;
    const saved = await persistNow({
      silent: true,
      patch: { status: "submitted" },
    });
    clearInsuranceDraftFromSession();
    const ref = `CASE-${Date.now()}`;
    setCaseReference(ref);
    setSubmitted(true);
    onSubmit?.(saved || buildPersistPayload({ status: "submitted" }));
  };

  const visibleSteps = useMemo(() => {
    // Step 3 (for new cars) and step 5 (premium breakup) are hidden from flow
    const rows = STEP_TITLES.map((title, idx) => ({
      originalStep: idx + 1,
      title,
    })).filter((s) => !shouldSkipStep(s.originalStep));
    return rows;
  }, [shouldSkipStep]);

  const stepIndex = useMemo(() => {
    return Math.max(
      0,
      visibleSteps.findIndex((s) => s.originalStep === step),
    );
  }, [visibleSteps, step]);

  const stepErrorToast = useMemo(() => {
    if (!showErrors) return null;
    if (step === 1 && Object.keys(step1Errors).length) {
      return {
        key: "insurance-step-validation",
        content:
          "Customer name (or company name) and a valid 10-digit mobile are required before moving to the next step. +91 / spaces are OK.",
      };
    }
    if (step === 2 && Object.keys(step2Errors).length) {
      return {
        key: "insurance-step-validation",
        content:
          "Fix the required vehicle information fields before moving ahead.",
      };
    }
    if (step === 3 && Object.keys(step3Errors).length) {
      return {
        key: "insurance-step-validation",
        content:
          "Review previous policy details before moving ahead. Claim last year is mandatory for this flow.",
      };
    }
    if (step === 4 && !shouldSkipStep(4) && quotes.length === 0) {
      return {
        key: "insurance-step-validation",
        content: "Add at least one quote before moving to the next step.",
      };
    }
    if (step === 4 && !shouldSkipStep(4) && !acceptedQuoteId) {
      return {
        key: "insurance-step-validation",
        content: "Accept one quote before moving to the next step.",
      };
    }
    if (step === 6 && !handleStepValidation()) {
      return {
        key: "insurance-step-validation",
        content:
          "Complete policy fields in this stage before moving ahead: insurance company, policy type/number, issue date and start date.",
      };
    }
    return null;
  }, [
    showErrors,
    step,
    step1Errors,
    step2Errors,
    step3Errors,
    acceptedQuoteId,
    quotes.length,
    shouldSkipStep,
    handleStepValidation,
  ]);

  useEffect(() => {
    if (!stepErrorToast) return;
    message.error({
      key: stepErrorToast.key,
      content: stepErrorToast.content,
      duration: 3,
    });
  }, [stepErrorToast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const node = stickyHeaderRef.current;
    if (!node) return undefined;

    const syncStickyHeaderHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height || 0);
      setStickyHeaderHeight((prev) =>
        prev === nextHeight ? prev : nextHeight,
      );
    };

    syncStickyHeaderHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncStickyHeaderHeight);
      return () => window.removeEventListener("resize", syncStickyHeaderHeight);
    }

    const observer = new ResizeObserver(syncStickyHeaderHeight);
    observer.observe(node);
    window.addEventListener("resize", syncStickyHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncStickyHeaderHeight);
    };
  }, [step, formData, shouldSkipStep]);

  const docRows = useMemo(() => {
    return (documents || []).map((d) => ({
      key: d.id,
      ...d,
      sizeKb: Math.round(Number(d.size || 0) / 1024 || 0),
    }));
  }, [documents]);

  const quoteRows = useMemo(() => {
    return (quotes || []).map((q, idx) => ({
      key: getQuoteRowId(q, idx),
      ...q,
      id: getQuoteRowId(q, idx),
    }));
  }, [quotes]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1CustomerInfo
            formData={formData}
            setField={setField}
            handleChange={handleChange}
            modifiedCrmFields={modifiedCrmFields}
            showErrors={showErrors}
            step1Errors={step1DisplayErrors}
            isCompany={isCompany}
            employeeOptions={employeeOptions}
            employeesLoading={employeesLoading}
            employeesList={employeesList}
            customerSearchResults={customerSearchResults}
            customerSearchLoading={customerSearchLoading}
            cityLookupLoading={cityLookupLoading}
            searchCustomers={searchCustomers}
            applyCustomerToForm={applyCustomerToForm}
            applyReferenceFromCustomer={applyReferenceFromCustomer}
            getCustomerId={getCustomerId}
            onPolicyDoneByChange={handlePolicyDoneByChange}
            onSourceChange={handleSourceChange}
            isExtendedWarranty={isExtendedWarranty}
          />
        );
      case 2:
        return (
          <Step2VehicleDetails
            formData={formData}
            setField={setField}
            handleChange={handleChange}
            showErrors={showErrors}
            step2Errors={step2Errors}
            isNewCar={isNewCar}
            isExtendedWarranty={isExtendedWarranty}
            registrationLookupLoading={registrationLookupLoading}
            registrationLookupOptions={registrationLookupOptions}
            handleRegistrationSearch={handleRegistrationSearch}
            applyVehicleToForm={applyVehicleToForm}
            includeDiscontinuedVehicles={includeDiscontinuedVehicles}
            setIncludeDiscontinuedVehicles={setIncludeDiscontinuedVehicles}
            makeOptions={makeOptions}
            modelOptions={modelOptions}
            variantOptions={variantOptions}
            isGeneratingTempReg={isGeneratingTempReg}
            vehiclePotentialMatch={vehiclePotentialMatch}
            vehiclePotentialMatches={vehiclePotentialMatches}
            vehicleMatchLoading={vehicleMatchLoading}
            vehicleMergeLoading={vehicleMergeLoading}
            onMergeVehicleMatch={handleMergeVehicleMatch}
            customerVehicleRows={customerVehicleRows}
            customerVehicleLoading={customerVehicleLoading}
            onRefreshVehicleDerivedFields={refreshVehicleDerivedFields}
            onHydrateVehicleSelectionOptions={hydrateVehicleSelectionOptions}
          />
        );
      case 3:
        if (shouldSkipStep(3)) return null;
        return (
          <Step3PreviousPolicy
            formData={formData}
            setField={setField}
            handleChange={handleChange}
            showErrors={showErrors}
            step3Errors={step3Errors}
            handlePreviousPolicyStartOrDuration={
              handlePreviousPolicyStartOrDuration
            }
          />
        );
      case 4:
        if (isExtendedWarranty) return null;
        return (
          <Step4InsuranceQuotes
            quoteDraft={quoteDraft}
            setQuoteDraft={setQuoteDraft}
            quoteComputed={quoteComputed}
            quotes={quotes}
            quoteRows={quoteRows}
            acceptedQuoteId={acceptedQuoteId}
            acceptedQuote={acceptedQuote}
            showErrors={showErrors}
            addQuote={addQuote}
            acceptQuote={acceptQuote}
            deleteQuote={deleteQuote}
            initialQuoteDraft={initialQuoteDraft}
            onStartEditQuote={startEditQuote}
            editingQuoteId={editingQuoteId}
            isNewCar={isNewCar}
            isIssued={formData.status === "issued"}
            suggestedNcbDiscount={step4SuggestedNcb}
            suggestedIdv={step4SuggestedIdv}
            showStandaloneAgeWarning={step4ShowStandaloneAgeWarning}
            toINR={toINR}
            getQuoteRowId={getQuoteRowId}
            computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
            formatStoredOrComputedIdv={formatStoredOrComputedIdv}
            formatStoredOrComputedPremium={formatStoredOrComputedPremium}
            onSaveDraft={() => persistNow({ silent: false })}
            onResetQuoteDraft={resetQuoteDraft}
            isSaving={saving}
            planFeaturesModal={planFeaturesModal}
            setPlanFeaturesModal={setPlanFeaturesModal}
            previousPolicyContext={{
              previousInsuranceCompany: formData.previousInsuranceCompany,
              previousPolicyType: formData.previousPolicyType,
              previousOwnDamageAmount:
                formData.previousOwnDamageAmount ||
                formData.previousBasicOwnDamageAmount,
              previousThirdPartyAmount:
                formData.previousThirdPartyAmount ||
                formData.previousBasicThirdPartyAmount,
              previousAddOnsTotal: formData.previousAddOnsTotal,
              previousTotalPremium: formData.previousTotalPremium,
              previousIdvAmount: formData.previousIdvAmount,
              previousNcbDiscount: formData.previousNcbDiscount,
              previousSelectedAddOns: formData.previousSelectedAddOns || [],
              claimTakenLastYear: formData.claimTakenLastYear,
              customerName: formData.customerName || formData.contactPersonName || "",
              mobile: formData.mobile || "",
              registrationNumber: formData.registrationNumber || "",
              vehicleMake: formData.vehicleMake || "",
              vehicleModel: formData.vehicleModel || "",
              vehicleVariant: formData.vehicleVariant || "",
              fuelType: formData.fuelType || "",
              manufactureYear: formData.manufactureYear || "",
              vehicleType: formData.vehicleType || "",
            }}
          />
        );
      case 6:
        if (!Step6NewPolicyDetails) {
          return (
            <Alert
              type="error"
              showIcon
              message="Step 6 component failed to load"
              description="Please refresh once. If issue persists, contact support with this case ID."
            />
          );
        }
        return (
          <Step6NewPolicyDetails
            formData={formData}
            setField={setField}
            handleChange={handleChange}
            handleNewPolicyStartOrDuration={handleNewPolicyStartOrDuration}
            acceptedQuote={acceptedQuote}
            acceptedQuoteBreakup={acceptedQuoteBreakup}
            durationOptions={durationOptions}
            paymentHistory={paymentHistory}
            setPaymentModalVisible={setPaymentModalVisible}
            insuranceDbId={insuranceDbId}
            toINR={toINR}
            insuranceApi={insuranceApi}
          />
        );
      case 7:
        return (
          <Step7Documents
            formData={formData}
            documents={documents}
            setDocuments={setDocuments}
            schedulePersist={schedulePersist}
            docRows={docRows}
            docsTaggedCount={docsTaggedCount}
            allUploadedDocsTagged={allUploadedDocsTagged}
          />
        );
      case 8:
        return (
          <Step8Payment
            formData={formData}
            setField={setField}
            setFormData={setFormData}
            paymentForm={paymentForm}
            setPaymentForm={setPaymentForm}
            paymentHistory={paymentHistory}
            setPaymentHistory={setPaymentHistory}
            schedulePersist={schedulePersist}
            acceptedQuote={acceptedQuote}
            onAppendPaymentEntry={savePaymentEntry}
            saveMeta={{
              saving,
              lastSavedAt,
              saveError,
            }}
            onRetrySave={() => persistNow({ silent: false })}
          />
        );
      case 9:
        if (!Step9Payout) {
          return (
            <Alert
              type="error"
              showIcon
              message="Step 9 component failed to load"
              description="Please refresh once. If issue persists, contact support with this case ID."
            />
          );
        }
        return (
          <Step9Payout
            formData={formData}
            setField={setField}
            setFormData={setFormData}
            schedulePersist={schedulePersist}
            acceptedQuote={acceptedQuote}
            acceptedQuoteBreakup={acceptedQuoteBreakup}
            bankOptions={bankOptions}
          />
        );
      default:
        return null;
    }
  };

  // ─── Computed values for Case Summary drawer ──────────────────────────────
  const summaryGrossPremium = Number(
    formData.newTotalPremium || acceptedQuoteBreakup?.totalPremium || 0,
  );
  const summaryTotalCollected = paymentHistory.reduce(
    (s, p) => s + Number(p.amount || 0),
    0,
  );
  const summaryBalanceDue = Math.max(
    0,
    summaryGrossPremium - summaryTotalCollected,
  );
  const summaryReceivables = Array.isArray(formData.insurance_receivables)
    ? formData.insurance_receivables
    : [];
  const summaryPayables = Array.isArray(formData.insurance_payables)
    ? formData.insurance_payables
    : [];
  const summaryNetMargin =
    summaryReceivables.reduce(
      (s, r) => s + Number(r.net_payout_amount || 0),
      0,
    ) -
    summaryPayables.reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);

  // ─── Step 8 success screen + wizard (shared Ant Design theme with Loan PreFile)
  const insuranceShellClassName = `insurance-case-skin insurance-dashboard-shell ${
    step === 1 ? "insurance-step1-neutral" : ""
  } min-h-screen bg-slate-50/50 dark:bg-slate-950/20
        [&_.ant-card]:!rounded-xl
        [&_.ant-card-body]:!p-5
        [&_.ant-form-item]:!mb-4
        [&_.ant-form-item-label_>label]:!text-sm [&_.ant-form-item-label_>label]:!font-medium
        [&_.ant-input]:!rounded-xl
        [&_.ant-input-affix-wrapper]:!rounded-xl
        [&_.ant-input-number]:!w-full [&_.ant-input-number]:!rounded-xl
        [&_.ant-select-selector]:!rounded-xl
        [&_.ant-btn]:!rounded-xl
        [&_.ant-picker]:!rounded-xl
        [&_.ant-radio-group_.ant-radio-button-wrapper]:!h-10 [&_.ant-radio-group_.ant-radio-button-wrapper]:!leading-10`;

  return (
    <InsuranceAntdProvider>
      {submitted ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircleFilled
                className="text-emerald-500"
                style={{ fontSize: 44 }}
              />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Case Submitted!
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Your insurance case has been successfully submitted and saved.
            </p>
            <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Case Reference
              </p>
              <p className="mt-1 text-2xl font-bold tracking-wide text-slate-900 dark:text-white">
                {caseReference}
              </p>
            </div>
            <div className="mb-4 space-y-2 text-left">
              {(formData.customerName || formData.companyName) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formData.customerName || formData.companyName}
                  </span>
                </div>
              )}
              {formData.registrationNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formData.registrationNumber}
                  </span>
                </div>
              )}
              {summaryGrossPremium > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Premium</span>
                  <span className="font-semibold text-emerald-600">
                    {toINR(summaryGrossPremium)}
                  </span>
                </div>
              )}
            </div>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => onCancel?.()}
              className="mt-4 h-11"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className={insuranceShellClassName}>
          {InsuranceStickyHeader ? (
            <InsuranceStickyHeader
              formData={formData}
              activeStep={step}
              onStepClick={navigateToStep}
              skipPreviousPolicyStep={shouldSkipStep(3)}
              skipQuotesStep={shouldSkipStep(4)}
              innerRef={stickyHeaderRef}
            />
          ) : null}

          <div
            className="pb-28 sm:pb-32 md:pb-36"
            style={{
              paddingTop: `max(${stickyHeaderHeight + 10}px, 3.25rem)`,
            }}
          >
            <div className="w-full px-3 py-3 md:px-5 lg:px-6">
              <div className="space-y-5">{renderStep()}</div>
            </div>
          </div>

          {InsuranceStageFooter ? (
            <InsuranceStageFooter
              activeStep={step}
              displayStep={stepIndex + 1}
              totalSteps={visibleSteps.length}
              isLastStep={stepIndex === visibleSteps.length - 1}
              onNext={step === 9 ? handleSubmitFinal : goNext}
              onExit={handleSaveAndExit}
              onDiscard={handleDiscard}
              onClear={handleClearForm}
              isSaving={saving}
              mode={mode}
            />
          ) : null}

          <Modal
            title="Record Payment"
            open={paymentModalVisible}
            onCancel={() => {
              setPaymentModalVisible(false);
              setPaymentForm({
                amount: 0,
                date: new Date().toISOString().slice(0, 10),
                paymentType: "customer",
                paymentMode: "Cash",
                transactionRef: "",
                remarks: "",
              });
            }}
            onOk={() => {
              if (paymentForm.amount <= 0) {
                message.error("Amount must be greater than 0");
                return;
              }
              const newPayment = {
                _id: `payment-${Date.now()}`,
                idempotencyKey: `payment-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`,
                ...paymentForm,
                amount: Number(paymentForm.amount),
                recordedAt: new Date().toISOString(),
              };
              setPaymentHistory((prev) => [...prev, newPayment]);

              if (paymentForm.paymentType === "customer") {
                setFormData((prev) => ({
                  ...prev,
                  customerPaymentReceived:
                    Number(prev.customerPaymentReceived || 0) +
                    Number(paymentForm.amount),
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  inhousePaymentReceived:
                    Number(prev.inhousePaymentReceived || 0) +
                    Number(paymentForm.amount),
                }));
              }

              setPaymentModalVisible(false);
              setPaymentForm({
                amount: 0,
                date: new Date().toISOString().slice(0, 10),
                paymentType: "customer",
                paymentMode: "Cash",
                transactionRef: "",
                remarks: "",
              });
              schedulePersist(250);
              message.success("Payment recorded successfully");
            }}
            okText="Record Payment"
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text strong>Payment Type *</Text>
                <Radio.Group
                  value={paymentForm.paymentType}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentType: e.target.value,
                    }))
                  }
                  style={{ marginTop: 6, display: "block" }}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="customer">
                    Customer → AutoCredit
                  </Radio.Button>
                  <Radio.Button value="inhouse">
                    AutoCredit → Insurance Co.
                  </Radio.Button>
                </Radio.Group>
              </div>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text strong>Amount (₹) *</Text>
                  <InputNumber
                    size="large"
                    min={0}
                    value={paymentForm.amount}
                    onChange={(v) =>
                      setPaymentForm((prev) => ({ ...prev, amount: v }))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                    placeholder="Enter amount"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Date *</Text>
                  <Input
                    size="large"
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    style={{ marginTop: 6 }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Payment Mode *</Text>
                  <Select
                    size="large"
                    value={paymentForm.paymentMode}
                    onChange={(v) =>
                      setPaymentForm((prev) => ({ ...prev, paymentMode: v }))
                    }
                    style={{ width: "100%", marginTop: 6 }}
                    options={[
                      { label: "Cash", value: "Cash" },
                      { label: "Cheque", value: "Cheque" },
                      { label: "NEFT", value: "NEFT" },
                      { label: "RTGS", value: "RTGS" },
                      { label: "UPI", value: "UPI" },
                      { label: "Card", value: "Card" },
                      { label: "Other", value: "Other" },
                    ]}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong>Transaction Ref</Text>
                  <Input
                    size="large"
                    value={paymentForm.transactionRef}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        transactionRef: e.target.value,
                      }))
                    }
                    style={{ marginTop: 6 }}
                    placeholder="UTR / Cheque no."
                  />
                </Col>
                <Col xs={24}>
                  <Text strong>Remarks</Text>
                  <Input.TextArea
                    rows={2}
                    value={paymentForm.remarks}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    style={{ marginTop: 6 }}
                    placeholder="Optional notes"
                  />
                </Col>
              </Row>
            </Space>
          </Modal>
        </div>
      )}

      {/* Unsaved-changes guard — shown whenever the user tries to leave with
          un-persisted edits (exit button, discard button, header navigation). */}
      <UnsavedChangesModal
        open={unsavedModal.open}
        saving={saving}
        onSave={async () => {
          const success = await persistNow({ silent: false });
          if (success) {
            setUnsavedModal({ open: false, pendingAction: null });
            unsavedModal.pendingAction?.();
          }
        }}
        onDiscard={() => {
          // Reset the snapshot so window.__isInsuranceFormDirty clears
          // before navigation to avoid any double-prompt.
          savedSnapshotRef.current = currentSnapshotRef.current;
          setUnsavedModal({ open: false, pendingAction: null });
          unsavedModal.pendingAction?.();
        }}
        onCancel={() => {
          setUnsavedModal({ open: false, pendingAction: null });
        }}
      />
    </InsuranceAntdProvider>
  );
};

export default NewInsuranceCaseForm;
