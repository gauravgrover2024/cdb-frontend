// src/modules/customers/EditCustomer.jsx

import React, { useEffect, useRef, useState } from "react";
import { Form, message, Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../../api/customers";
import Icon from "../../components/AppIcon";
import { useFormAutoSave } from "../../utils/formDataProtection";

import PersonalDetails from "./customer-form/PersonalDetails";
import EmploymentDetails from "./customer-form/EmploymentDetails";
import IncomeDetails from "./customer-form/IncomeDetails";
import KycDetails from "./customer-form/KycDetails";
import BankDetails from "./customer-form/BankDetails";
import ReferenceDetails from "./customer-form/ReferenceDetails";
import CustomerStickyHeader from "./components/CustomerStickyHeader";

// Clean empty and undefined values from object
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

const sectionsConfig = [
  {
    key: "personal",
    label: "Personal",
    targetId: "section-personal",
    icon: "User",
  },
  {
    key: "employment",
    label: "Employment",
    targetId: "section-employment",
    icon: "Briefcase",
  },
  {
    key: "income",
    label: "Income",
    targetId: "section-income",
    icon: "Wallet",
  },
  {
    key: "bank",
    label: "Bank",
    targetId: "section-bank",
    icon: "Building2",
  },
  {
    key: "references",
    label: "References",
    targetId: "section-other",
    icon: "Users",
  },
  {
    key: "kyc",
    label: "KYC",
    targetId: "section-kyc",
    icon: "ShieldCheck",
  },
];

// -----------------------------
// API helpers
// -----------------------------
const fetchCustomerById = async (id) => {
  const data = await customersApi.getById(id);
  return data?.data || null;
};

const updateCustomerById = async (id, payload) => {
  try {
    const updatedData = await customersApi.update(id, payload);
    return updatedData;
  } catch (error) {
    console.error("❌ Failed to update customer via customersApi:", error);
    throw new Error(error.message || "Failed to update customer");
  }
};

// -----------------------------
// Component
// -----------------------------
const EditCustomer = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("personal");

  const [headerInfo, setHeaderInfo] = useState({
    name: "",
    mobile: "",
    city: "",
    pan: "",
  });

  const [saving, setSaving] = useState(false);

  // ============================================
  // ⚡ AUTO-SAVE FORM DATA PROTECTION
  // ============================================
  const { autoSaveStatus, clearSavedFormData, handleFormValuesChange } = useFormAutoSave(
    'CUSTOMER_FORM_DATA',
    form,
    true // isEditMode = true, don't restore from localStorage
  );

  // Header height (for correct scroll offset)
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(180);

  // -----------------------------
  // Measure header height
  // -----------------------------
  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const h = headerRef.current.getBoundingClientRect().height;
      if (h && h > 100) setHeaderHeight(h);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // -----------------------------
  // Load customer from Mongo
  // -----------------------------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);

        const found = await fetchCustomerById(id);

        if (!found) {
          message.error("Customer not found");
          navigate("/customers");
          return;
        }

        setCustomer(found);
        const applicantType = found.applicantType || "Individual";

        // Patch dates into dayjs
        form.setFieldsValue({
          applicantType,
          customerIdDisplay: found.customerId || found.customerIdDisplay || "",
          customerName: found.customerName || "",
          sdwOf: found.sdwOf || "",
          fatherName: found.fatherName || found.sdwOf || "",
          gender: found.gender || "",
          dob: found.dob ? dayjs(found.dob) : null,
          motherName: found.motherName || "",
          residenceAddress: found.residenceAddress || "",
          pincode: found.pincode || "",
          city: found.city || "",
          addressType: found.addressType || "",
          identityProofType: found.identityProofType || "",
          identityProofNumber: found.identityProofNumber || "",
          identityProofExpiry: found.identityProofExpiry ? dayjs(found.identityProofExpiry) : null,
          addressProofType: found.addressProofType || "",
          addressProofNumber: found.addressProofNumber || "",
          contactPersonName: found.contactPersonName || "",
          contactPersonMobile: found.contactPersonMobile || "",
          sameAsCurrentAddress: found.sameAsCurrentAddress ?? false,
          permanentAddress: found.permanentAddress || "",
          permanentPincode: found.permanentPincode || "",
          permanentCity: found.permanentCity || "",
          yearsInCurrentHouse: found.yearsInCurrentHouse || "",
          yearsInCurrentCity: found.yearsInCurrentCity || "",
          houseType: found.houseType || "",
          education: found.education || "",
          educationOther: found.educationOther || "",
          maritalStatus: found.maritalStatus || "",
          dependents: found.dependents || "",
          hasCoApplicant: found.hasCoApplicant ?? false,
          hasGuarantor: found.hasGuarantor ?? false,
          primaryMobile: found.primaryMobile || "",
          extraMobiles: Array.isArray(found.extraMobiles) ? found.extraMobiles : [],
          email: found.email || "",
          docsPreparedBy: found.docsPreparedBy || "",
          nomineeName: found.nomineeName || "",
          nomineeDob: found.nomineeDob ? dayjs(found.nomineeDob) : null,
          nomineeRelation: found.nomineeRelation || "",

          occupationType: found.occupationType || "",
          professionalType: found.professionalType || "",
          companyName: found.companyName || "",
          companyPartners: Array.isArray(found.companyPartners) ? found.companyPartners : [],
          isMSME: found.isMSME || "",
          companyType: Array.isArray(found.companyType) ? found.companyType[0] : (found.companyType || ""),
          businessNature: Array.isArray(found.businessNature)
            ? found.businessNature
            : (typeof found.businessNature === "string"
              ? found.businessNature.split(",").map((v) => v.trim()).filter(Boolean)
              : []),
          employmentAddress: found.employmentAddress || "",
          employmentPincode: found.employmentPincode || "",
          employmentCity: found.employmentCity || "",
          employmentPhone: found.employmentPhone || "",
          officialEmail: found.officialEmail || "",
          salaryMonthly: found.salaryMonthly || "",
          designation: found.designation || "",
          incorporationYear: found.incorporationYear || "",
          experienceCurrent: found.experienceCurrent || "",
          totalExperience: found.totalExperience || "",

          panNumber: found.panNumber || "",
          panCardDocUrl: found.panCardDocUrl || "",
          addressProofDocUrl: found.addressProofDocUrl || "",
          totalIncomeITR: found.totalIncomeITR ?? found.itrYears ?? "",

          bankName: found.bankName || "",
          accountNumber: found.accountNumber || "",
          ifsc: found.ifsc || found.ifscCode || "",
          ifscCode: found.ifscCode || found.ifsc || "",
          branch: found.branch || "",
          accountSinceYears: found.accountSinceYears ?? "",
          openedIn: found.openedIn ?? "",
          accountType: found.accountType || "",

          // Support both nested (reference1) and flat (reference1_name) from API
          reference1: found.reference1 || (found.reference1_name != null || found.reference1_mobile != null ? {
            name: found.reference1_name || "",
            mobile: found.reference1_mobile || "",
            address: found.reference1_address || "",
            pincode: found.reference1_pincode || "",
            city: found.reference1_city || "",
            relation: found.reference1_relation || "",
          } : null),
          reference2: found.reference2 || (found.reference2_name != null || found.reference2_mobile != null ? {
            name: found.reference2_name || "",
            mobile: found.reference2_mobile || "",
            address: found.reference2_address || "",
            pincode: found.reference2_pincode || "",
            city: found.reference2_city || "",
            relation: found.reference2_relation || "",
          } : null),

          aadhaarNumber: found.aadhaarNumber || found.aadharNumber || "",
          aadharNumber: found.aadharNumber || found.aadhaarNumber || "",
          aadhaarCardDocUrl: found.aadhaarCardDocUrl || "",
          passportNumber: found.passportNumber || "",
          passportDocUrl: found.passportDocUrl || "",
          gstNumber: found.gstNumber || "",
          gstDocUrl: found.gstDocUrl || "",
          dlNumber: found.dlNumber || "",
          dlDocUrl: found.dlDocUrl || "",
          registerSameAsAadhaar: found.registerSameAsAadhaar || "",
          registerSameAsPermanent: found.registerSameAsPermanent || "",
          registrationAddress: found.registrationAddress || "",
          registrationPincode: found.registrationPincode || "",
          registrationCity: found.registrationCity || "",
          co_customerName: found.co_customerName || "",
          co_primaryMobile: found.co_primaryMobile || "",
          co_pan: found.co_pan || "",
          co_dob: found.co_dob ? dayjs(found.co_dob) : null,
          co_address: found.co_address || "",
          signatory_customerName: found.signatory_customerName || "",
          signatory_primaryMobile: found.signatory_primaryMobile || "",
          signatory_dob: found.signatory_dob ? dayjs(found.signatory_dob) : null,
          signatory_address: found.signatory_address || "",
          signatory_pincode: found.signatory_pincode || "",
          signatory_city: found.signatory_city || "",
          signatory_designation: found.signatory_designation || "",
          signatory_pan: found.signatory_pan || "",
          signatory_aadhaar: found.signatory_aadhaar || "",
        });

        setHeaderInfo({
          name: found.customerName || "",
          mobile: found.primaryMobile || "",
          city: found.city || "",
          pan: found.panNumber || "",
        });


      } catch (err) {
        console.error("Load Customer Error:", err);
        message.error("Failed to load customer ❌");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, form, navigate]);

  // -----------------------------
  // Scroll helper (scroll inside #app-scroll-container)
  // -----------------------------
  const scrollToSection = (targetId) => {
    const container = document.getElementById("app-scroll-container");
    const el = document.getElementById(targetId);

    if (!container || !el) return;

    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;

    const SCROLL_OFFSET = headerHeight + 16;

    const scrollTop =
      container.scrollTop + (elTop - containerTop) - SCROLL_OFFSET;

    container.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  };

  // -----------------------------
  // Scroll Spy (active pill highlight)
  // -----------------------------
  useEffect(() => {
    const container = document.getElementById("app-scroll-container");
    if (!container) return;

    const onScroll = () => {
      const OFFSET = headerHeight + 16;

      const offsets = sectionsConfig.map((s) => {
        const el = document.getElementById(s.targetId);
        if (!el) return { key: s.key, top: Infinity };
        return { key: s.key, top: el.getBoundingClientRect().top };
      });

      const visible = offsets.reduce((prev, curr) =>
        Math.abs(curr.top - OFFSET) < Math.abs(prev.top - OFFSET) ? curr : prev,
      );

      if (visible.key && visible.key !== activeSection) {
        setActiveSection(visible.key);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => container.removeEventListener("scroll", onScroll);
  }, [activeSection, headerHeight]);

  // -----------------------------
  // Header live update
  // -----------------------------
  const handleValuesChange = (_, allValues) => {
    setHeaderInfo({
      name: allValues.customerName || "",
      mobile: allValues.primaryMobile || "",
      city: allValues.city || "",
      pan: allValues.panNumber || "",
    });
  };

  // -----------------------------
  // Autosave (Disabled as per user request)
  // -----------------------------
  /*
  const valuesSnapshot = Form.useWatch([], form);
  const autosavePayload = useMemo(() => ...);
  useEffect(() => ...);
  */

  // -----------------------------
  // Manual Save buttons
  // -----------------------------
  const handleSaveOnly = async () => {
    if (!id) return;

    try {
      setSaving(true);

      // ✅ FIX: Get ALL fields, then clean empty/cache values
      const values = form.getFieldsValue(true);
      const cleaned = cleanEmptyValues(values);

      // Flatten reference1/reference2 to match backend schema (reference1_name, etc.)
      const flat = { ...cleaned };
      if (flat.reference1 && typeof flat.reference1 === "object") {
        flat.reference1_name = flat.reference1.name;
        flat.reference1_mobile = flat.reference1.mobile;
        flat.reference1_address = flat.reference1.address;
        flat.reference1_pincode = flat.reference1.pincode;
        flat.reference1_city = flat.reference1.city;
        flat.reference1_relation = flat.reference1.relation;
        delete flat.reference1;
      }
      if (flat.reference2 && typeof flat.reference2 === "object") {
        flat.reference2_name = flat.reference2.name;
        flat.reference2_mobile = flat.reference2.mobile;
        flat.reference2_address = flat.reference2.address;
        flat.reference2_pincode = flat.reference2.pincode;
        flat.reference2_city = flat.reference2.city;
        flat.reference2_relation = flat.reference2.relation;
        delete flat.reference2;
      }

      const payload = {
        ...flat,
        dob: flat?.dob ? (dayjs.isDayjs(flat.dob) ? flat.dob.format("YYYY-MM-DD") : flat.dob) : "",
        nomineeDob: flat?.nomineeDob
          ? (dayjs.isDayjs(flat.nomineeDob) ? flat.nomineeDob.format("YYYY-MM-DD") : flat.nomineeDob)
          : "",
        identityProofExpiry: flat?.identityProofExpiry
          ? (dayjs.isDayjs(flat.identityProofExpiry) ? flat.identityProofExpiry.format("YYYY-MM-DD") : flat.identityProofExpiry)
          : "",
        co_dob: flat?.co_dob ? (dayjs.isDayjs(flat.co_dob) ? flat.co_dob.format("YYYY-MM-DD") : flat.co_dob) : "",
        signatory_dob: flat?.signatory_dob
          ? (dayjs.isDayjs(flat.signatory_dob) ? flat.signatory_dob.format("YYYY-MM-DD") : flat.signatory_dob)
          : "",
        // companyType is single-select in UI; businessNature stays multi-select
        companyType: Array.isArray(flat?.companyType) 
          ? flat.companyType[0] || "" 
          : flat?.companyType || "",
        businessNature: Array.isArray(flat?.businessNature)
          ? flat.businessNature
          : (flat?.businessNature ? [flat.businessNature] : []),
        companyPartners: Array.isArray(flat?.companyPartners) ? flat.companyPartners : [],
        ifsc: flat?.ifsc || flat?.ifscCode || "",
        ifscCode: flat?.ifscCode || flat?.ifsc || "",
        aadhaarNumber: flat?.aadhaarNumber || flat?.aadharNumber || "",
        aadharNumber: flat?.aadharNumber || flat?.aadhaarNumber || "",
        updatedAt: new Date().toISOString(),
      };

      await updateCustomerById(id, payload);

      // ✅ Clear auto-saved form data after successful save
      clearSavedFormData();

      // 🔗 IMPORTANT: Clear loan-related caches so linked loans reflect updated customer data
      localStorage.removeItem('loan_form_draft');
      localStorage.removeItem('loans_list_cache');

      message.success("Saved ✅");
    } catch (err) {
      console.error("Save Error:", err);
      message.error("Save failed ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    try {
      await handleSaveOnly();
      navigate("/customers");
    } catch (err) {
      // already handled
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <Spin size="large" />
           <span className="text-muted-foreground animate-pulse">Loading Customer Profile...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
       <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="text-center">
             <Icon name="UserX" size={48} className="mx-auto text-muted-foreground mb-4" />
             <h2 className="text-xl font-bold">Profile Not Found</h2>
             <button onClick={() => navigate('/customers')} className="mt-4 text-primary font-medium hover:underline">Back to Directory</button>
          </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <CustomerStickyHeader
        headerInfo={headerInfo}
        mode="Edit"
        displayId={customer.customerId || id}
        onSave={handleSaveOnly}
        onSaveAndExit={handleSaveAndExit}
        activeSection={activeSection}
        sectionsConfig={sectionsConfig}
        onSectionClick={(targetId) => scrollToSection(targetId)}
        innerRef={headerRef}
        saving={saving}
        autoSaveStatus={autoSaveStatus}
      />

      <div className="flex flex-col md:flex-row gap-0 bg-muted/20 min-h-[calc(100vh-4rem)]">
        <div className="flex-1 min-w-0 bg-background dark:bg-black md:mb-4 md:mx-4 md:rounded-3xl border-x md:border border-border shadow-sm">
          <div className="px-3 md:px-8 pt-6 pb-28 md:pb-32 bg-[linear-gradient(180deg,rgba(56,189,248,0.12)_0px,rgba(16,185,129,0.08)_56px,rgba(255,255,255,0)_130px)] dark:bg-[linear-gradient(180deg,rgba(14,116,144,0.22)_0px,rgba(4,120,87,0.14)_56px,rgba(2,6,23,0)_130px)]">
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(changedValues, allValues) => {
                handleValuesChange(changedValues, allValues);
                handleFormValuesChange();
              }}
            >
              <div id="section-personal" className="mb-10 scroll-mt-[220px]">
                <PersonalDetails />
              </div>

              <div id="section-employment" className="mb-10 scroll-mt-[220px]">
                <EmploymentDetails />
              </div>

              <div id="section-income" className="mb-10 scroll-mt-[220px]">
                <IncomeDetails />
              </div>

              <div id="section-bank" className="mb-10 scroll-mt-[220px]">
                <BankDetails />
              </div>

              <div id="section-other" className="mb-10 scroll-mt-[220px]">
                <ReferenceDetails />
              </div>

              <div id="section-kyc" className="mb-6 scroll-mt-[220px]">
                <KycDetails />
              </div>
            </Form>
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 md:bottom-24 left-1/2 z-[940] flex w-[calc(100%-1rem)] max-w-[760px] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2.5 shadow-elevation-4 backdrop-blur-sm">
        {sectionsConfig.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => scrollToSection(section.targetId)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              activeSection === section.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name={section.icon || "Circle"} size={12} />
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EditCustomer;
