// src/modules/loans/components/LoanFormWithSteps.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useFormAutoSave, AutoSaveIndicator } from "../../../utils/formDataProtection";

import LeadDetails from "./loan-form/customer-profile/LeadDetails";
import VehicleDetailsForm from "./loan-form/customer-profile/VehicleDetailsForm";
import FinanceDetailsForm from "./loan-form/customer-profile/FinanceDetailsForm";
import PersonalDetailsWithSearch from "./loan-form/PersonalDetailsWithSearch";

import EmploymentDetails from "../../customers/customer-form/EmploymentDetails";
import IncomeDetails from "../../customers/customer-form/IncomeDetails";
import BankDetails from "../../customers/customer-form/BankDetails";
import ReferenceDetails from "../../customers/customer-form/ReferenceDetails";
import KycDetails from "../../customers/customer-form/KycDetails";

import PersonalDetailsPreFile from "./loan-form/pre-file/PersonalDetailsPreFile";
import OccupationalDetailsPreFile from "./loan-form/pre-file/OccupationalDetailsPreFile";
import IncomeBankingDetailsPreFile from "./loan-form/pre-file/IncomeBankingDetailsPreFile";
import VehiclePricingLoanDetails from "./loan-form/pre-file/VehiclePricingLoanDetails";
import Section7RecordDetails from "./loan-form/pre-file/Section7RecordDetails";
import CoApplicantSection from "./loan-form/pre-file/CoApplicantSection";
import GuarantorSection from "./loan-form/pre-file/GuarantorSection";
import AuthorisedSignatorySection from "./loan-form/pre-file/AuthorisedSignatorySection";
import BulkLoanCreationSection from "./loan-form/pre-file/BulkLoanCreationSection";

import LoanApprovalStep from "./loan-form/loan-approval/LoanApprovalStep";
import PostFileStep from "./loan-form/post-file/PostFileStep";
import VehicleDeliveryStep from "./loan-form/vehicle-delivery/VehicleDeliveryStep";
import PayoutSection from "./loan-form/payout/PayoutSection";

import LoanStickyHeader from "./LoanStickyHeader";
import StageFooter from "./StageFooter";
import LoanStepperSidebar from "./LoanStepperSidebar";
import Icon from "../../../components/AppIcon";
import { loansApi } from "../../../api/loans";
import { customersApi } from "../../../api/customers";

// ... (existing imports/code) ...


// Date helpers (safe for AntD)
// ----------------------------
const toDayjs = (val) => {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val;

  let d = dayjs(val);
  if (d.isValid()) return d;

  d = dayjs(val, "DD MMM YYYY", true);
  if (d.isValid()) return d;

  return null;
};

const convertAnyDateToDayjsDeep = (value) => {
  if (!value) return value;

  if (dayjs.isDayjs(value)) return value;
  if (value instanceof Date) return dayjs(value);

  if (typeof value === "string") {
    // ✅ ONLY convert real ISO-like date strings
    // Examples:
    // 2026-01-27T09:35:54.250Z
    // 1993-06-16
    const isIsoDate = /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value);

    if (!isIsoDate) return value;

    const d = dayjs(value);
    return d.isValid() ? d : value;
  }

  if (Array.isArray(value)) {
    return value.map(convertAnyDateToDayjsDeep);
  }

  if (typeof value === "object") {
    const out = {};
    for (const k in value) {
      out[k] = convertAnyDateToDayjsDeep(value[k]);
    }
    return out;
  }

  return value;
};

// Clean empty and undefined values from object (used for cache etc.)
const cleanEmptyValues = (obj, omitFields = []) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => cleanEmptyValues(item, omitFields))
      .filter((item) => item !== null && item !== undefined && item !== "");
  }

  const cleaned = {};
  for (const key in obj) {
    if (omitFields.includes(key)) continue;
    
    const value = obj[key];
    
    // Skip nulls, undefined, empty strings
    if (value === null || value === undefined || value === "") continue;
    
    // Recursively clean nested objects
    if (typeof value === "object" && !dayjs.isDayjs(value) && !(value instanceof Date)) {
      const nested = cleanEmptyValues(value, omitFields);
      if (Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// For loan submit: keep empty strings and false so every section's user input is stored as-is
const cleanPayloadForSubmit = (obj, omitFields = []) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPayloadForSubmit(item, omitFields));
  }

  const cleaned = {};
  for (const key in obj) {
    if (omitFields.includes(key)) continue;
    const value = obj[key];
    // Only skip undefined (keep "", null, 0, false so DB reflects user feed)
    if (value === undefined) continue;
    if (typeof value === "object" && value !== null && !dayjs.isDayjs(value) && !(value instanceof Date)) {
      const nested = cleanPayloadForSubmit(value, omitFields);
      cleaned[key] = nested;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const convertDatesToStringsDeep = (obj) => {
  if (!obj) return obj;

  if (Array.isArray(obj)) return obj.map(convertDatesToStringsDeep);

  if (typeof obj === "object") {
    if (dayjs.isDayjs(obj)) return obj.toISOString();
    if (obj instanceof Date) return obj.toISOString();

    const out = {};
    for (const k in obj) out[k] = convertDatesToStringsDeep(obj[k]);
    return out;
  }

  return obj;
};

const LoanFormWithSteps = ({ mode, initialData }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();

  const loanIdFromRoute = params?.loanId || params?.id;

  const isEditMode = useMemo(() => {
    return Boolean(mode === "edit" || loanIdFromRoute);
  }, [mode, loanIdFromRoute]);

  // ============================================
  // ⚡ AUTO-SAVE FORM DATA PROTECTION
  // ============================================
  const {
    autoSaveStatus,
    saveToLocalStorage,
    clearSavedFormData,
    restoreSavedFormData,
    handleFormValuesChange,
  } = useFormAutoSave('LOAN_FORM_DATA', form, isEditMode);

  // Watch finance flag early
  const watchedIsFinanced = Form.useWatch("isFinanced", form);
  const [activeStep, setActiveStep] = useState(() => {
    if (watchedIsFinanced === "No") return "delivery";
    return "profile";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // If financing is set to No, always force delivery step
  React.useEffect(() => {
    if (watchedIsFinanced === "No" && activeStep !== "delivery") {
      setActiveStep("delivery");
    }
  }, [watchedIsFinanced]);

  // Notes Modal Component
  const NotesModal = ({ open, onClose }) => {
    const [notes, setNotes] = useState(() => form?.getFieldValue("loan_notes") || "");

    if (!open) return null;

    const handleSave = () => {
      form.setFieldsValue({ loan_notes: notes });
      message.success("Notes saved");
      onClose?.();
    };

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="MessageSquare" size={18} className="text-primary" />
              <div className="text-sm font-semibold text-foreground">Loan Notes</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <Icon name="X" size={18} />
            </button>
          </div>
          <div className="p-4">
            <textarea
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background min-h-[220px] focus:outline-none"
              placeholder="Add internal notes for this loan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Documents Modal Component
  const DocumentsModal = ({ open, onClose }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="FileText" size={18} className="text-primary" />
              <div className="text-sm font-semibold text-foreground">Loan Documents</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <Icon name="X" size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { title: "Customer KYC", icon: "UserCheck", count: 5, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                { title: "Bank Documents", icon: "Building", count: 3, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                { title: "Vehicle Documents", icon: "Car", count: 4, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                { title: "Approval Letters", icon: "FileCheck", count: 2, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                { title: "Disbursement Docs", icon: "CreditCard", count: 3, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
                { title: "Post-File Records", icon: "FileText", count: 6, color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
              ].map((category, idx) => (
                <div key={idx} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${category.color}`}>
                  <div className="flex items-start justify-between mb-2">
                    <Icon name={category.icon} size={20} />
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background/50">{category.count}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{category.title}</h3>
                  <p className="text-xs opacity-70">Click to view all</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">All documents are stored securely</span>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // banksData must persist across steps
  const [banksData, setBanksData] = useState([]);

  // Default to null/undefined if not set. Only strictly "Yes" enables finance sections.
  const isFinancedValue = watchedIsFinanced; 
  const isCashCase = watchedIsFinanced === "No";

  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ----------------------------
  // API helpers
  // ----------------------------
  const fetchLoanById = useCallback(async (loanId) => {
    if (!loanId) return null;
    const json = await loansApi.getById(loanId);
    return json?.data || null;
  }, []);

  const createLoan = useCallback(async (payload) => {
    const json = await loansApi.create(payload);
    // Return full response so we can show customerLinked (e.g. "created from loan")
    return json || null;
  }, []);

  const updateLoan = useCallback(async (loanId, payload) => {
    const json = await loansApi.update(loanId, payload);
    return json?.data || null;
  }, []);

  // ----------------------------
  // Load existing loan (EDIT MODE)
  // ----------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);

        // If initialData is provided (from EditLoan), use it directly
        let loan = initialData;
        
        // Otherwise fetch from API if we have loanIdFromRoute
        if (!loan && loanIdFromRoute) {
          loan = await fetchLoanById(loanIdFromRoute);
        }

        if (!mounted) return;

        const fixed = convertAnyDateToDayjsDeep(loan || {});
        form.setFieldsValue(fixed);


        // Hydrate each bank in approval_banksData with vehicle/prefile fields if missing
        if (Array.isArray(loan?.approval_banksData)) {
          const vehicleFields = [
            'vehicleMake', 'vehicleModel', 'vehicleVariant', 'exShowroomPrice',
            'typeOfLoan', 'onRoadPrice', 'downPayment', 'financeExpectation',
            'customerName', 'primaryMobile', 'customerEmail', 'customerPan', 'customerAadhar', 'customerAddress', 'city'
          ];
          const hydratedBanks = loan.approval_banksData.map(bank => {
            const hydrated = { ...bank };
            vehicleFields.forEach(field => {
              if (hydrated[field] === undefined && loan[field] !== undefined) {
                hydrated[field] = loan[field];
              }
            });
            return hydrated;
          });
          setBanksData(hydratedBanks);
        }

        if (loan?.currentStage) {
          setActiveStep(loan.currentStage);
        }
      } catch (e) {
        console.error("Load loan failed:", e);
        alert("Failed to load loan ❌");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isEditMode, loanIdFromRoute, fetchLoanById, form, initialData]);

  // keep banksData mirrored in form for persistence
  useEffect(() => {
    form.setFieldsValue({ approval_banksData: banksData });
  }, [banksData, form]);

  // ----------------------------
  // Sync primary bank -> form fields
  // ----------------------------
  const syncPrimaryApprovalToForm = useCallback(() => {
    const primaryBank =
      banksData.find((b) => b.status === "Disbursed") ||
      banksData.find((b) => b.status === "Approved") ||
      banksData[0] ||
      null;

    if (!primaryBank) return;

    const cleanNumber = (val) =>
      Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;

    const approvalDate =
      primaryBank.approvalDate ||
      primaryBank.statusHistory?.find((h) => h.status === "Approved")
        ?.changedAt ||
      null;

    const disbursedDate =
      primaryBank.disbursedDate ||
      primaryBank.statusHistory?.find((h) => h.status === "Disbursed")
        ?.changedAt ||
      null;

    form.setFieldsValue({
      approval_bankId: primaryBank.id,
      approval_bankName: primaryBank.bankName || "",
      approval_status: primaryBank.status || "Pending",
      approval_loanAmountApproved: cleanNumber(primaryBank.loanAmount),
      approval_loanAmountDisbursed: cleanNumber(
        primaryBank.disbursedAmount || primaryBank.loanAmount,
      ),
      approval_roi: Number(primaryBank.interestRate) || undefined,
      approval_tenureMonths: Number(primaryBank.tenure) || undefined,
      approval_processingFees: cleanNumber(primaryBank.processingFee),
      approval_approvalDate: approvalDate ? toDayjs(approvalDate) : null,
      approval_disbursedDate: disbursedDate ? toDayjs(disbursedDate) : null,
      approval_breakup_netLoanApproved: primaryBank.breakupNetLoanApproved ?? 0,
      approval_breakup_creditAssured: primaryBank.breakupCreditAssured ?? 0,
      approval_breakup_insuranceFinance:
        primaryBank.breakupInsuranceFinance ?? 0,
      approval_breakup_ewFinance: primaryBank.breakupEwFinance ?? 0,
      payoutPercentage: primaryBank.payoutPercent || "",
    });
  }, [banksData, form]);

  // ----------------------------
  // Save logic (API only)
  // ----------------------------
  // Builds full payload from every section: profile, prefile, approval, postfile, delivery, payout.
  // form.getFieldsValue(true) returns all Form.Item values from the entire form.
  const buildLoanPayload = useCallback(
    (extra = {}) => {
      syncPrimaryApprovalToForm();

      const raw = {
        ...form.getFieldsValue(true),
        ...extra,
      };

      // \ud83d\udd27 FIX: Flatten nested reference objects to match backend schema
      // Backend expects: reference1_name, reference1_mobile, etc.
      // Form has: reference1: { name, mobile, ... }
      if (raw.reference1 && typeof raw.reference1 === 'object') {
        raw.reference1_name = raw.reference1.name;
        raw.reference1_mobile = raw.reference1.mobile;
        raw.reference1_address = raw.reference1.address;
        raw.reference1_pincode = raw.reference1.pincode;
        raw.reference1_city = raw.reference1.city;
        raw.reference1_relation = raw.reference1.relation;
        delete raw.reference1; // Remove nested object
      }
      
      if (raw.reference2 && typeof raw.reference2 === 'object') {
        raw.reference2_name = raw.reference2.name;
        raw.reference2_mobile = raw.reference2.mobile;
        raw.reference2_address = raw.reference2.address;
        raw.reference2_pincode = raw.reference2.pincode;
        raw.reference2_city = raw.reference2.city;
        raw.reference2_relation = raw.reference2.relation;
        delete raw.reference2; // Remove nested object
      }

      // 🧹 For submit: keep "" and false so every section's data is stored according to user feed
      const cleaned = cleanPayloadForSubmit(raw, ['_id', '__v']);

      // 🚫 DO NOT reconvert values already strings
      const sanitized = convertDatesToStringsDeep(cleaned);
      
      // Cleanup internal fields
      delete sanitized._id;
      delete sanitized.__v;
      delete sanitized.createdAt;
      delete sanitized.updatedAt;

      // Convert array fields to strings for backend compatibility
      if (Array.isArray(sanitized.companyType)) {
        sanitized.companyType = sanitized.companyType[0] || "";
      }
      if (Array.isArray(sanitized.co_companyType)) {
        sanitized.co_companyType = sanitized.co_companyType[0] || "";
      }
      if (Array.isArray(sanitized.gu_companyType)) {
        sanitized.gu_companyType = sanitized.gu_companyType[0] || "";
      }

      const payload = {
        ...sanitized,
        currentStage: activeStep,
        isFinanced: sanitized?.isFinanced === "No" ? "No" : "Yes",
        // Ensure Yes/No and Switch choices are always stored (including "No" and false)
        hasCoApplicant: Boolean(sanitized?.hasCoApplicant),
        hasGuarantor: Boolean(sanitized?.hasGuarantor),
        recordSource: sanitized?.recordSource ?? undefined,
        source: sanitized?.source ?? undefined,
        sourceName: sanitized?.sourceName ?? undefined,
        payoutApplicable: sanitized?.payoutApplicable ?? undefined,
        prefile_sourcePayoutPercentage: sanitized?.prefile_sourcePayoutPercentage ?? undefined,
        approval_banksData: banksData,
      };

      // if new create, backend should set createdAt
      return payload;
    },
    [activeStep, banksData, form, syncPrimaryApprovalToForm],
  );


  // ----------------------------
  // Helper: Sync Customer Data
  // ----------------------------
  /* =========================================================
     SYNC HELPERS (Map Loan Form -> Customer Schema)
     ========================================================= */
  const syncCustomerData = useCallback(async (silent) => {
    try {
      const formValues = form.getFieldsValue(true);
      const name = formValues.customerName;
      const mobile = formValues.primaryMobile;
      
      const currentCustomerId = formValues.customerId;
      // If a customer is already linked, return it even if fields are incomplete
      if (currentCustomerId && (!name || !mobile || mobile.length < 10)) {
        return currentCustomerId;
      }

      // Only sync if we have minimum valid ID data for new customer creation
      if (!name || !mobile || mobile.length < 10) return null;
      
      // 1. Base Personal Details
      const customerDataRaw = {
          customerName: name,
          primaryMobile: mobile,
          email: formValues.email,
          emailAddress: formValues.email, // Alias
          whatsappNumber: formValues.whatsappNumber,
          sdwOf: formValues.sdwOf,
          fatherName: formValues.fatherName,
          gender: formValues.gender,
          dob: formValues.dob,
          motherName: formValues.motherName,
          
          residenceAddress: formValues.residenceAddress,
          pincode: formValues.pincode,
          city: formValues.city,
          state: formValues.state,
          yearsInCurrentHouse: formValues.yearsInCurrentHouse,
          yearsInCurrentCity: formValues.yearsInCurrentCity,
          houseType: formValues.houseType,
          
          permanentAddress: formValues.permanentAddress,
          permanentPincode: formValues.permanentPincode,
          permanentCity: formValues.permanentCity,
          currentAddress: formValues.currentAddress,

          education: formValues.education,
          educationOther: formValues.educationOther,
          maritalStatus: formValues.maritalStatus,
          dependents: formValues.dependents,
          extraMobiles: formValues.extraMobiles, // Array
          
          nomineeName: formValues.nomineeName,
          nomineeDob: formValues.nomineeDob,
          nomineeRelation: formValues.nomineeRelation,
          
          // 2. Employment / Professional - COMPLETE MAPPING
          occupationType: formValues.occupationType,
          employmentType: formValues.employmentType,
          professionalType: formValues.professionalType,
          companyName: formValues.companyName,
          designation: formValues.designation,
          companyType: formValues.companyType,
          businessNature: formValues.businessNature,
          currentExp: formValues.currentExp, // Years - CRITICAL
          totalExp: formValues.totalExp, // Years - CRITICAL
          incorporationYear: formValues.incorporationYear,
          
          // Map Loan Form "Employment" fields -> Customer "Company" fields (Both variants)
          employmentAddress: formValues.employmentAddress,
          employmentPincode: formValues.employmentPincode,
          employmentCity: formValues.employmentCity,
          employmentPhone: formValues.employmentPhone,
          companyAddress: formValues.employmentAddress || formValues.companyAddress,
          companyPincode: formValues.employmentPincode || formValues.companyPincode,
          companyCity: formValues.employmentCity || formValues.companyCity,
          companyPhone: formValues.employmentPhone || formValues.companyPhone,
          officialEmail: formValues.officialEmail,
          officeAddress: formValues.officeAddress,
          
          // 3. Income - COMPLETE ALL VARIANTS
          monthlyIncome: formValues.monthlyIncome, 
          salaryMonthly: formValues.salaryMonthly,
          monthlySalary: formValues.monthlySalary,
          annualIncome: formValues.annualIncome,
          totalIncomeITR: formValues.totalIncomeITR,
          annualTurnover: formValues.annualTurnover,
          netProfit: formValues.netProfit,
          otherIncome: formValues.otherIncome,
          otherIncomeSource: formValues.otherIncomeSource,
          
          // Loan Finance Details
          typeOfLoan: formValues.typeOfLoan,
          financeExpectation: formValues.financeExpectation,
          loanTenureMonths: formValues.loanTenureMonths,

          // 4. KYC Documents (Map both spelling variants)
          aadhaarNumber: formValues.aadhaarNumber, 
          aadharNumber: formValues.aadhaarNumber || formValues.aadharNumber, // Legacy alias
          panNumber: formValues.panNumber,
          passportNumber: formValues.passportNumber,
          dlNumber: formValues.dlNumber,
          gstNumber: formValues.gstNumber,
          voterId: formValues.voterId,
          
          aadhaarCardDocUrl: formValues.aadhaarCardDocUrl,
          panCardDocUrl: formValues.panCardDocUrl,
          passportDocUrl: formValues.passportDocUrl,
          dlDocUrl: formValues.dlDocUrl,
          gstDocUrl: formValues.gstDocUrl,
          addressProofDocUrl: formValues.addressProofDocUrl,
          
          // 5. Banking (Primary Account)
          bankName: formValues.bankName,
          accountNumber: formValues.accountNumber,
          ifscCode: formValues.ifscCode,
          ifsc: formValues.ifscCode || formValues.ifsc, // Alias
          branch: formValues.branch,
          accountType: formValues.accountType,
          accountSinceYears: formValues.accountSinceYears,
          openedIn: formValues.openedIn,
          
          // 6. References - COMPLETE (Pull from nested or flat fields)
          reference1_name: formValues.reference1_name || formValues.reference1?.name,
          reference1_mobile: formValues.reference1_mobile || formValues.reference1?.mobile,
          reference1_address: formValues.reference1_address || formValues.reference1?.address,
          reference1_pincode: formValues.reference1_pincode || formValues.reference1?.pincode,
          reference1_city: formValues.reference1_city || formValues.reference1?.city,
          reference1_relation: formValues.reference1_relation || formValues.reference1?.relation,
          reference2_name: formValues.reference2_name || formValues.reference2?.name,
          reference2_mobile: formValues.reference2_mobile || formValues.reference2?.mobile,
          reference2_address: formValues.reference2_address || formValues.reference2?.address,
          reference2_pincode: formValues.reference2_pincode || formValues.reference2?.pincode,
          reference2_city: formValues.reference2_city || formValues.reference2?.city,
          reference2_relation: formValues.reference2_relation || formValues.reference2?.relation,

          // 7. Generic Proofs (from Personal Details PreFile)
          identityProofType: formValues.identityProofType,
          identityProofNumber: formValues.identityProofNumber,
          addressProofType: formValues.addressProofType,
          addressProofNumber: formValues.addressProofNumber,
          identityProofExpiry: formValues.identityProofExpiry,
          addressType: formValues.addressType,
          
          // 8. Customer Type & Notes
          customerType: formValues.customerType,
          loan_notes: formValues.loan_notes,
          kycStatus: formValues.kycStatus,
      };
      
      // Clean dates & empty values before sending
      const cleanData = convertDatesToStringsDeep(cleanEmptyValues(customerDataRaw));

      // Convert array fields to strings for backend compatibility
      if (Array.isArray(cleanData.companyType)) {
        cleanData.companyType = cleanData.companyType[0] || "";
      }
      if (Array.isArray(cleanData.businessNature)) {
        // Keep as array for backend - it accepts arrays
        // cleanData.businessNature stays as array
      }

      if (currentCustomerId) {
          // Update existing Customer
          // We use PUT/PATCH semantics via our API wrapper
          // Note: ensure your backend 'update' does merges, not full replacements
          await customersApi.update(currentCustomerId, cleanData);
          return currentCustomerId;
      } else {
          // Create new Customer
          const res = await customersApi.create(cleanData);
          const newId = res?.data?._id || res?.data?.id || res?._id || res?.id;
          if (newId) {
               form.setFieldsValue({ customerId: newId });
               return newId;
          }
      }
    } catch (e) {
      console.error("Failed to sync customer profile:", e);
      // Non-blocking error
    }
    return null;
  }, [form]);

  const handleSaveLoan = useCallback(
    async (shouldExit = false, extraData = {}, silent = false) => {
      try {
        if (!silent) setSaving(true);

        // 1. Sync Customer (Create/Update) - OPTIONAL, backend will auto-create if needed
        const syncedCustomerId = await syncCustomerData(silent);
        const effectiveCustomerId = form.getFieldValue("customerId") || syncedCustomerId;
        
        // Set customerId if we have one from sync
        if (effectiveCustomerId && !form.getFieldValue("customerId")) {
          form.setFieldsValue({ customerId: effectiveCustomerId });
        }

        // 2. Build Loan Payload (includes customerName and primaryMobile for backend auto-create)
        const payload = buildLoanPayload(extraData);

        // CREATE (Fallback if accessed directly via /loans/new)
        if (!isEditMode) {
          const numberOfCars = Number(payload.numberOfCars) || 1;
          const result = await createLoan(payload);

          // BULK SUCCESS CASE
          if (numberOfCars > 1) {
             if (!silent) {
                 alert(result?.message || `Successfully created ${numberOfCars} loan applications.`);
                 navigate("/loans");
             }
             return true;
          }

          // SINGLE SUCCESS CASE (result = full API response: { loanId, data, customerLinked, message, ... })
          const loanData = result?.data || result;
          let newLoanId = result?.loanId || loanData?.loanId;
          if (!newLoanId) {
            if (result?.id || loanData?.id) newLoanId = result?.id || loanData?.id;
            else throw new Error("Loan created but loanId not returned");
          }

          form.setFieldsValue({
            loanId: newLoanId,
            createdAt: (loanData?.createdAt || result?.createdAt) || new Date().toISOString(),
          });

          // Clear cached draft after successful save
          clearSavedFormData();

          // 🔗 Clear customer-related caches so synced data shows everywhere
          localStorage.removeItem('customer_form_draft');
          localStorage.removeItem('customers_list_cache');

          if (!silent && result?.customerLinked?.createdNew) {
            message.success(
              `Loan created. Customer "${result.customerLinked.customerName || 'New'}" was created from this form and will appear in the Customer dashboard.`,
              5
            );
          }

          if (shouldExit) {
            if (!silent) navigate("/loans");
          } else {
             navigate(`/loans/edit/${newLoanId}`, { replace: true });
          }

          return true;
        }

        // UPDATE (Existing Loan)
        const loanId = loanIdFromRoute || form.getFieldValue("loanId");
        if (!loanId) throw new Error("loanId missing for update");

        await updateLoan(loanId, payload);

        // Clear cached draft after successful update
        clearSavedFormData();

        // 🔗 Clear customer-related caches so synced data shows everywhere
        localStorage.removeItem('customer_form_draft');
        localStorage.removeItem('customers_list_cache');

        if (shouldExit && !silent) navigate("/loans");
        return true;
      } catch (e) {
        console.error("Save failed:", e);
        if (!silent) alert(`Save failed ❌\n${e.message}`);
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [
      buildLoanPayload,
      createLoan,
      updateLoan,
      form,
      isEditMode,
      loanIdFromRoute,
      navigate,
      syncCustomerData,
    ],
  );

  // ----------------------------
  // Actions
  // ----------------------------
  const handlePrint = () => window.print();

  const handleDiscard = () => {
    if (
      window.confirm(
        "Are you sure you want to discard changes and exit? This cannot be undone.",
      )
    ) {
      navigate("/loans");
    }
  };

  const handleProcessLoan = async () => {
    const success = await handleSaveLoan(false);
    if (!success) return;
    
    if (isCashCase) setActiveStep("delivery");
    else setActiveStep("prefile");
  };

  const handleMoveToApproval = async () => {
    const success = await handleSaveLoan(false);
    if (!success) return;
    
    if (isCashCase) setActiveStep("delivery");
    else setActiveStep("approval");
  };

  const handleDisburseLoan = async (bankId, disbursementDate, remarks = "") => {
    try {
      const bankToDisburse = banksData.find((b) => b.id === bankId);

      if (!bankToDisburse) {
        alert("❌ Bank not found");
        return;
      }

      // Get loanId (either from form or route)
      const loanId = loanIdFromRoute || form.getFieldValue("loanId");
      if (!loanId) {
        alert("❌ Loan ID not found. Please save the loan first.");
        return;
      }

      const cleanNumber = (val) =>
        Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;

      // ✅ Calculate EMI for post-file auto-fill
      const calculateEMI = (principal, annualRate, tenureMonths) => {
        const P = Number(principal) || 0;
        const N = Number(tenureMonths) || 0;
        const R = (Number(annualRate) || 0) / 12 / 100;
        if (!P || !N || !R) return 0;
        const pow = Math.pow(1 + R, N);
        return Math.round((P * R * pow) / (pow - 1));
      };

      const loanAmount = cleanNumber(bankToDisburse.loanAmount);
      const roi = Number(bankToDisburse.interestRate) || 0;
      const tenure = Number(bankToDisburse.tenure) || 0;
      const emiAmount = calculateEMI(loanAmount, roi, tenure);

      // ✅ Call backend disbursement API
      // This will trigger calculatePayoutsOnDisbursement() on backend
      await loansApi.disburse(loanId, {
        disburseAmount: loanAmount,
        disbursedBankName: bankToDisburse.bankName || "",
        payoutPercentage: bankToDisburse.payoutPercent || 0,
        disbursedDate: new Date(disbursementDate).toISOString(),
        remarks: remarks || "",
      });

      console.log("✅ Disbursement API call successful");

      // Now update local state AFTER successful API call
      const updatedBanks = banksData.map((bank) => {
        if (bank.id === bankId) {
          return {
            ...bank,
            status: "Disbursed",
            disbursedDate: disbursementDate,
            disbursementRemarks: remarks,
            statusHistory: [
              ...(bank.statusHistory || []),
              {
                status: "Disbursed",
                changedAt: new Date(disbursementDate).toISOString(),
                note: remarks || "Loan disbursed",
              },
            ],
          };
        }
        return bank;
      });

      setBanksData(updatedBanks);

      // ONLY set non-date fields
      form.setFieldsValue({
        approval_bankId: bankToDisburse.id,
        approval_bankName: bankToDisburse.bankName || "",
        approval_status: "Disbursed",
        approval_loanAmountApproved: loanAmount,
        approval_loanAmountDisbursed: loanAmount,
        approval_roi: roi || undefined,
        approval_tenureMonths: tenure || undefined,
        approval_processingFees: cleanNumber(bankToDisburse.processingFee),
        approval_breakup_netLoanApproved:
          bankToDisburse.breakupNetLoanApproved || 0,
        approval_breakup_creditAssured: bankToDisburse.breakupCreditAssured || 0,
        approval_breakup_insuranceFinance:
          bankToDisburse.breakupInsuranceFinance || 0,
        approval_breakup_ewFinance: bankToDisburse.breakupEwFinance || 0,
        payoutPercentage: bankToDisburse.payoutPercent || "",
        disburse_status: "Disbursed",
        disburse_bankName: bankToDisburse.bankName || "",
        disburse_remarks: remarks,
        __postfileSeeded: true,
        postfile_bankName: bankToDisburse.bankName || "",
        postfile_loanAmountApproved: loanAmount,
        postfile_loanAmountDisbursed: loanAmount,
        postfile_roi: roi || undefined,
        postfile_tenureMonths: tenure || undefined,
        postfile_processingFees: cleanNumber(bankToDisburse.processingFee),
        postfile_emiAmount: emiAmount,
        postfile_firstEmiDate: bankToDisburse.firstEmiDate || undefined,
      });

      // ✅ Save loan with disbursement details
      const success = await handleSaveLoan(false, {}, true);
      if (!success) {
        alert("⚠️ Disbursement succeeded but saving failed. Please refresh to verify.");
      }

      alert("✅ Loan disbursed successfully! Receivables have been created and saved.");
      setActiveStep("postfile");
    } catch (e) {
      console.error("❌ Disbursement failed:", e);
      alert(`❌ Disbursement failed: ${e.message}`);
    }
  };

  const handleMoveToDelivery = async () => {
    const success = await handleSaveLoan(false);
    if (success) setActiveStep("delivery");
  };

  const handleCloseLead = () => {
    form.setFieldsValue({
      status: "Completed",
      completedDate: dayjs(),
    });

    handleSaveLoan(true);
  };

  const handleApprovalNext = () => {
    setActiveStep("postfile");
  };

  // ----------------------------
  // Render step
  // ----------------------------
  const renderStep = () => {
    // If not financed, only show delivery step
    if (watchedIsFinanced === "No") {
      return <VehicleDeliveryStep form={form} />;
    }
    switch (activeStep) {
      case "profile":
        return (
          <>
            <div id="lead"><LeadDetails /></div>
            <div id="vehicle"><VehicleDetailsForm /></div>
            <div id="finance"><FinanceDetailsForm /></div>
            <div id="personal"><PersonalDetailsWithSearch
              excludeFields={isFinancedValue !== "Yes"}
            /></div>
            <div id="employment"><EmploymentDetails /></div>
            <div id="income"><IncomeDetails /></div>
            <div id="bank"><BankDetails /></div>
            <div id="references"><ReferenceDetails /></div>
            <div id="kyc"><KycDetails /></div>
          </>
        );

      case "prefile":
        return (
          <>
            <div id="personal_pre"><PersonalDetailsPreFile /></div>
            <div id="occupational"><OccupationalDetailsPreFile /></div>
            <div id="income_banking"><IncomeBankingDetailsPreFile /></div>
            <div id="vehicle_loan"><VehiclePricingLoanDetails /></div>
            <div id="references"><ReferenceDetails /></div>
            <div id="kyc"><KycDetails /></div>
            <div id="section7"><Section7RecordDetails /></div>
            <div id="co_applicant"><CoApplicantSection /></div>
            <div id="guarantor"><GuarantorSection /></div>
            <div id="auth_signatory"><AuthorisedSignatorySection /></div>
            <div id="bulk_loan"><BulkLoanCreationSection form={form} /></div>
          </>
        );

      case "approval":
        return (
          <LoanApprovalStep
            form={form}
            banksData={banksData}
            setBanksData={setBanksData}
            onNext={() => setActiveStep("postfile")}
            loanId={loanIdFromRoute}
          />
        );

      case "postfile":
        return <PostFileStep form={form} banksData={banksData} />;

      case "delivery":
        return <VehicleDeliveryStep form={form} />;

      case "payout":
        return <PayoutSection form={form} />;

      default:
        return null;
    }
  };

  // ----------------------------
  // Hidden fields (safe)
  // ----------------------------
  const HiddenFields = () => (
    <>
      <Form.Item name="loanId" hidden />
      <Form.Item name="customerId" hidden />
      <Form.Item name="customerName" hidden />
      <Form.Item name="primaryMobile" hidden />
      <Form.Item name="createdAt" hidden />
      <Form.Item name="updatedAt" hidden />
      <Form.Item name="currentStage" hidden />
      <Form.Item name="status" hidden />
      <Form.Item name="completedDate" hidden />
      <Form.Item name="loan_notes" hidden />

      <Form.Item name="approval_bankId" hidden />
      <Form.Item name="approval_bankName" hidden />
      <Form.Item name="approval_status" hidden />
      <Form.Item name="approval_loanAmountApproved" hidden />
      <Form.Item name="approval_loanAmountDisbursed" hidden />
      <Form.Item name="approval_roi" hidden />
      <Form.Item name="approval_tenureMonths" hidden />
      <Form.Item name="approval_processingFees" hidden />
      <Form.Item name="approval_approvalDate" hidden />
      <Form.Item name="approval_disbursedDate" hidden />
      <Form.Item name="approval_breakup_netLoanApproved" hidden />
      <Form.Item name="approval_breakup_creditAssured" hidden />
      <Form.Item name="approval_breakup_insuranceFinance" hidden />
      <Form.Item name="approval_breakup_ewFinance" hidden />
      <Form.Item name="approval_banksData" hidden />
      <Form.Item name="payoutPercentage" hidden />

      <Form.Item name="delivery_invoiceFile" hidden />
      <Form.Item name="delivery_rcFile" hidden />
      <Form.Item name="postfile_documents" hidden />

      <Form.Item name="postfile_bankName" hidden />
      <Form.Item name="postfile_loanAmountApproved" hidden />
      <Form.Item name="postfile_loanAmountDisbursed" hidden />
      <Form.Item name="postfile_roi" hidden />
      <Form.Item name="postfile_tenureMonths" hidden />
      <Form.Item name="postfile_processingFees" hidden />
      <Form.Item name="postfile_emiAmount" hidden />
      <Form.Item name="postfile_firstEmiDate" hidden />

      <Form.Item name="__postfileSeeded" hidden />
      <Form.Item name="__postfileLocked" hidden />
    </>
  );

  const headerTitle = useMemo(() => {
    const name = form.getFieldValue("customerName") || "Loan";
    const vehicle = [
      form.getFieldValue("vehicleMake"),
      form.getFieldValue("vehicleModel"),
    ]
      .filter(Boolean)
      .join(" ");
    const type = form.getFieldValue("typeOfLoan");

    return [name, vehicle, type].filter(Boolean).join(" • ");
  }, [form]);

  // ----------------------------
  // Sidebar & Navigation
  // ----------------------------
  // Watch key form fields to trigger completion calculation
  const customerName = Form.useWatch("customerName", form);
  const mobileNo = Form.useWatch("mobileNo", form);
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const loanAmount = Form.useWatch("loanAmount", form);
  const bankName = Form.useWatch("bankName", form);
  const tenure = Form.useWatch("tenure", form);
  const approvalStatus = Form.useWatch("approval_status", form);
  const postFileStatus = Form.useWatch("postFileStatus", form);
  const deliveryStatus = Form.useWatch("deliveryStatus", form);
  const payoutStatus = Form.useWatch("payoutStatus", form);

  // Calculate completed steps based on form values
  const completedSteps = useMemo(() => {
    const completed = [];
    
    // Profile stage - check if basic customer info is filled
    if (customerName && mobileNo && vehicleMake && vehicleModel) {
      completed.push('profile');
    }
    
    // Pre-file stage - check if loan details are filled
    if (loanAmount && bankName && tenure) {
      completed.push('prefile');
    }
    
    // Approval stage - check if approval status is set
    if (approvalStatus && approvalStatus !== 'Pending') {
      completed.push('approval');
    }
    
    // Post-file stage - check if post-file is marked
    if (postFileStatus === 'Completed') {
      completed.push('postfile');
    }
    
    // Delivery stage - check if delivery is completed
    if (deliveryStatus === 'Completed') {
      completed.push('delivery');
    }
    
    // Payout stage - check if payout is done
    if (payoutStatus === 'Completed') {
      completed.push('payout');
    }
    
    return completed;
  }, [customerName, mobileNo, vehicleMake, vehicleModel, loanAmount, bankName, tenure, approvalStatus, postFileStatus, deliveryStatus, payoutStatus]);

  const handleStageClick = (stageKey) => {
    setActiveStep(stageKey);
    // Optional: add smooth scroll to top when switching stages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionClick = (section) => {
    const key = section.key;
    const patterns = [
      key,
      `section-${key}`,
      `section-${key}-details`,
      `section-customer-${key}`,
      key === 'references' ? 'section-other' : null,
    ].filter(Boolean);
    
    let element = null;
    for (const id of patterns) {
      element = document.getElementById(id);
      if (element) break;
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      preserve
      style={{ margin: 0, padding: 0 }}
      onValuesChange={handleFormValuesChange}
    >
      <HiddenFields />

      {/* Two-column layout: Sidebar + Main Content */}
      <div
        className="flex flex-col md:flex-row gap-0 bg-muted/20 min-h-screen"
        style={{ maxWidth: 3000, margin: "0 auto", paddingTop: "4px" }}
      >
        {/* Sidebar Stepper - COMMENTED OUT
        <div 
          className={`hidden md:flex shrink-0 p-4 overflow-y-auto no-scrollbar transition-all duration-300 z-[90] ${
            isSidebarCollapsed ? "w-20" : "w-60"
          }`}
          style={{ position: "sticky", top: "130px", height: "calc(100vh - 130px)" }}
        >
          <LoanStepperSidebar
            currentStep={activeStep}
            completedSteps={completedSteps}
            sectionStatus={form.getFieldsValue(true)}
            onStageClick={handleStageClick}
            onSectionClick={handleSectionClick}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isFinanced={isFinancedValue}
            loanType={Form.useWatch("typeOfLoan", form)}
          />
        </div>
        */}

        {/* Main Form Content */}
        <div className="flex-1 min-w-0 bg-background md:mb-4 md:mr-4 md:rounded-3xl border-x md:border border-border shadow-sm flex flex-col min-h-screen transition-all duration-300">
          <LoanStickyHeader
            title={headerTitle}
            activeStep={activeStep}
            onStepChange={handleStageClick}
            isFinanced={isFinancedValue}
            form={form}
            isDisbursed={form?.getFieldValue("approval_status") === "Disbursed"}
            onSave={() => handleSaveLoan(false)}
            onExit={() => handleSaveLoan(true)}
            saving={saving}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            autoSaveStatus={autoSaveStatus}
          />

          {/* Form Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 md:px-8 py-14">
              <div className="w-full space-y-1 transition-all duration-300">
                {renderStep()}
              </div>
            </div>
          </div>

          <StageFooter
            currentStage={activeStep}
            isFinanced={isFinancedValue}
            onSave={() => handleSaveLoan(false)}
            onSaveAndExit={() => {
              syncPrimaryApprovalToForm();
              handleSaveLoan(true);
            }}
            onDiscard={handleDiscard}
            onPrint={handlePrint}
            onProcessLoan={isCashCase ? handleMoveToDelivery : handleProcessLoan}
            onMoveToApproval={handleMoveToApproval}
            onDisburseLoan={handleDisburseLoan}
            onMoveToPostFile={() => setActiveStep("postfile")}
            onMoveToDelivery={handleMoveToDelivery}
            onMoveToPayout={() => setActiveStep("payout")}
            onCloseLead={handleCloseLead}
            approvedBanks={banksData.filter((b) => b.status === "Approved")}
            form={form}
          />
        </div>
      </div>
      {saving && (
        <div className="fixed bottom-20 right-4 z-[950] bg-card border border-border rounded-xl px-3 py-2 shadow-elevation-2 text-xs text-muted-foreground">
          Saving...
        </div>
      )}

      {/* Quick Actions Floating Toolbar - All Steps */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[940] flex items-center gap-2 p-3 bg-card border border-border rounded-2xl shadow-elevation-4 backdrop-blur-sm">
        {["profile", "prefile", "approval", "postfile", "delivery", "payout"].map((step, index) => {
        // Accurate display names for steps
        const stepDisplayNames = {
          profile: "Profile",
          prefile: "Pre-File",
          approval: "Approval",
          postfile: "Post-File",
          delivery: "Delivery",
          payout: "Payout",
        };

        // Accurate section names for each step
        const stepSections = {
          profile: [
            { id: "lead", label: "Lead Details" },
            { id: "vehicle", label: "Vehicle Details" },
            { id: "finance", label: "Finance Details" },
            { id: "personal", label: "Personal Details" },
            { id: "employment", label: "Employment Details" },
            { id: "income", label: "Income Details" },
            { id: "bank", label: "Bank Details" },
            { id: "references", label: "References" },
            { id: "kyc", label: "KYC Details" },
          ],
          prefile: [
            { id: "personal_pre", label: "Personal Details" },
            { id: "occupational", label: "Occupational Details" },
            { id: "income_banking", label: "Income & Banking" },
            { id: "vehicle_loan", label: "Vehicle & Loan" },
            { id: "references", label: "References" },
            { id: "kyc", label: "KYC Details" },
            { id: "section7", label: "Record Details" },
            { id: "co_applicant", label: "Co-Applicant" },
            { id: "guarantor", label: "Guarantor" },
            { id: "auth_signatory", label: "Authorised Signatory" },
            { id: "bulk_loan", label: "Bulk Loan Creation" },
          ],
          approval: [
            { id: "approval-top", label: "Bank Status" },
            { id: "approval-matrix", label: "Comparison Matrix" },
            { id: "approval-records", label: "Record Details" },
          ],
          postfile: [
            { id: "postfile-top", label: "Post-File Details" },
          ],
          delivery: [
            { id: "delivery-top", label: "Delivery Details" },
          ],
          payout: [
            { id: "payout-top", label: "Payout Details" },
          ],
        };

        const sections = stepSections[step] || [];
        return (
          <React.Fragment key={step}>
            {index > 0 && <div className="w-px h-6 bg-border/30" />}
            <div className="relative group/stepnav">
              <button
                type="button"
                onClick={() => setActiveStep(step)}
                className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
                  activeStep === step
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {stepDisplayNames[step] || step.charAt(0).toUpperCase() + step.slice(1)}
              </button>
              {/* Dropdown menu on hover - now stays open on dropdown hover */}
              {sections.length > 0 && (
                <div
                  className="step-dropdown absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 opacity-0 invisible group-hover/stepnav:opacity-100 group-hover/stepnav:visible group-focus-within/stepnav:opacity-100 group-focus-within/stepnav:visible transition-all duration-200"
                >
                  <div className="bg-card border border-border rounded-xl shadow-elevation-3 p-2 min-w-[180px] max-h-[400px] overflow-y-auto">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setActiveStep(step);
                          setTimeout(() => {
                            const element = document.getElementById(section.id);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-muted/50 text-foreground hover:text-primary transition-colors"
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
      </div>
    </Form>
  );
};

export default LoanFormWithSteps;
