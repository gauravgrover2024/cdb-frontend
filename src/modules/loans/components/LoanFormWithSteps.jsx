// src/modules/loans/components/LoanFormWithSteps.jsx
import React, { useEffect, useState } from "react";
import { Form, Space, Tag } from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  CarOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import customParseFormat from "dayjs/plugin/customParseFormat";

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

import LoanApprovalStep from "./loan-form/loan-approval/LoanApprovalStep";
import PostFileStep from "./loan-form/post-file/PostFileStep";
import VehicleDeliveryStep from "./loan-form/vehicle-delivery/VehicleDeliveryStep";
import PayoutSection from "./loan-form/payout/PayoutSection"; // ADD THIS
import LoanStickyHeader from "./LoanStickyHeader"; // Add this import

import StageFooter from "./StageFooter";
import dayjs from "dayjs";

dayjs.extend(customParseFormat);
// ✅ Convert string/Date -> dayjs (for AntD DatePicker)
const toDayjs = (val) => {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val;

  // already ISO or normal date
  let d = dayjs(val);
  if (d.isValid()) return d;

  // handle "20 Dec 2025" format
  d = dayjs(val, "DD MMM YYYY", true);
  if (d.isValid()) return d;

  return null;
};

// ✅ Convert all known date fields in saved loan to dayjs
const fixLoanDateFields = (data) => {
  if (!data) return data;

  const fixed = { ...data };

  const dateKeys = [
    // Lead fields
    "leadDate",
    "leadTime",

    // system timestamps (only if bound to picker anywhere)
    "updatedAt",
    "createdAt",

    // customer / loan dates
    "dob",
    "nomineeDob",
    "approval_approvalDate",
    "approval_disbursedDate",
    "postfile_approvalDate",
    "postfile_firstEmiDate",

    "dispatch_date",
    "dispatch_time",
    "disbursement_date",
    "disbursement_time",
    "profileCompletedDate",
    "prefileCompletedDate",
    "approvalCompletedDate",
    "postfileCompletedDate",
    "delivery_date",
    "deliveryCompletedDate",
    "invoice_date",
    "invoice_received_date",
    "rc_redg_date",
    "rc_received_date",
    "ecs_date",
    "completedDate",
  ];

  dateKeys.forEach((key) => {
    if (fixed[key]) fixed[key] = toDayjs(fixed[key]);
  });

  Object.keys(fixed).forEach((k) => {
    const key = k.toLowerCase();
    if (
      (key.includes("date") || key.includes("time") || key.includes("dob")) &&
      fixed[k]
    ) {
      fixed[k] = toDayjs(fixed[k]);
    }
  });

  return fixed;
};

const convertAnyDateToDayjsDeep = (value) => {
  if (!value) return value;

  if (dayjs.isDayjs(value)) return value;

  if (value instanceof Date) return dayjs(value);

  if (typeof value === "string") {
    const d = dayjs(value);
    return d.isValid() ? d : value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => convertAnyDateToDayjsDeep(v));
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

const STEPS = [
  { key: "profile", label: "Customer Profile" },
  { key: "prefile", label: "Pre-File" },
  { key: "approval", label: "Loan Approval" },
  { key: "postfile", label: "Post-File" },
  { key: "delivery", label: "Vehicle Delivery" },
  { key: "payout", label: "Payout" }, // ADD THIS
];

const LoanFormWithSteps = () => {
  const [form] = Form.useForm();
  const [activeStep, setActiveStep] = useState("profile");

  // NEW: keep banksData at parent so it persists across steps
  const [banksData, setBanksData] = useState([]);

  // finance flag
  const watchedIsFinanced = Form.useWatch("isFinanced", form);
  const isFinancedValue = watchedIsFinanced === "No" ? "No" : "Yes";

  useEffect(() => {
    // Only load editing data if we're on an edit route
    const isEditMode = window.location.pathname.includes("/edit");

    if (!isEditMode) {
      localStorage.removeItem("editingLoan");
      localStorage.removeItem("editingLoanId");

      const draft = localStorage.getItem("loanDraft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);

          // convert date fields to dayjs again
          const fixedDraft = fixLoanDateFields(parsed);

          form.setFieldsValue(fixedDraft);
          console.log("✅ Draft loaded into new loan form");
        } catch (e) {
          console.log("❌ Draft parse failed", e);
        }
      }

      return;
    }

    const editingLoan = localStorage.getItem("editingLoan");
    if (editingLoan) {
      try {
        const loanData = JSON.parse(editingLoan);
        console.log("Loading loan for editing:", loanData);

        const sanitizedData = { ...loanData };

        // remove these only if they are time picker fields / invalid types
        delete sanitizedData.receivingDate;
        delete sanitizedData.receivingTime;

        // ✅ Convert saved ISO date strings into dayjs (fixes date.isValid crash)

        const fixedData = fixLoanDateFields(sanitizedData);

        Object.entries(fixedData).forEach(([k, v]) => {
          if (k.toLowerCase().includes("date") && v && !dayjs.isDayjs(v)) {
            console.log("❌ NOT dayjs date field:", k, v);
          }
        });

        const dateKeys = Object.keys(fixedData).filter(
          (k) =>
            k.toLowerCase().includes("date") || k.toLowerCase().includes("time")
        );

        dateKeys.forEach((k) => {
          const v = fixedData[k];
          console.log(
            "🧪",
            k,
            "=>",
            v,
            "| type:",
            typeof v,
            "| dayjs:",
            dayjs.isDayjs(v)
          );
        });
        // 🔥 Find any date/time-like fields that are NOT dayjs
        Object.entries(fixedData).forEach(([k, v]) => {
          const key = k.toLowerCase();

          const looksLikeDate =
            key.includes("date") || key.includes("time") || key.includes("dob");

          if (!looksLikeDate) return;

          // if value exists and is NOT dayjs -> this is a suspect
          if (v && !dayjs.isDayjs(v)) {
            console.log("🚨 SUSPECT (not dayjs):", k, v, "| type:", typeof v);
          }
        });

        form.setFieldsValue(fixedData);

        if (Array.isArray(loanData.approval_banksData)) {
          setBanksData(loanData.approval_banksData);
        } else if (loanData.approval_bankName) {
          // fallback old format
          setBanksData([
            {
              id: loanData.approval_bankId,
              bankName: loanData.approval_bankName,
              status: loanData.approval_status,
              loanAmount: loanData.approval_loanAmountApproved,
              interestRate: loanData.approval_roi,
              tenure: loanData.approval_tenureMonths,
              processingFee: loanData.approval_processingFees,
              breakupNetLoanApproved: loanData.approval_breakup_netLoanApproved,
              breakupCreditAssured: loanData.approval_breakup_creditAssured,
              breakupInsuranceFinance:
                loanData.approval_breakup_insuranceFinance,
              breakupEwFinance: loanData.approval_breakup_ewFinance,
            },
          ]);
        }

        if (loanData.currentStage) {
          setActiveStep(loanData.currentStage);
        }
      } catch (error) {
        console.error("Error loading loan:", error);
      }
    }
  }, [form]);

  useEffect(() => {
    if (!form.getFieldValue("isFinanced")) {
      form.setFieldsValue({ isFinanced: "Yes" });
    }
  }, [form]);

  useEffect(() => {
    if (isFinancedValue === "No") {
      const currentType = form.getFieldValue("typeOfLoan");
      if (!currentType) {
        form.setFieldsValue({ typeOfLoan: "New Car" });
      }
    }
  }, [isFinancedValue, form]);

  useEffect(() => {
    const approvalStatus = form.getFieldValue("approval_status");
    if (approvalStatus !== "Disbursed") return;

    // Only sync if postfile is still auto-seeded
    const postfileSeeded = form.getFieldValue("__postfileSeeded");
    if (!postfileSeeded) return;

    const approvalBank = form.getFieldValue("approval_bankName");
    const approvalDisbursed = form.getFieldValue(
      "approval_loanAmountDisbursed"
    );
    const approvalRoi = form.getFieldValue("approval_roi");
    const approvalTenure = form.getFieldValue("approval_tenureMonths");
    const approvalPf = form.getFieldValue("approval_processingFees");

    form.setFieldsValue({
      postfile_bankName: approvalBank,
      postfile_loanAmountDisbursed: approvalDisbursed,
      postfile_roi: approvalRoi,
      postfile_tenureMonths: approvalTenure,
      postfile_processingFees: approvalPf,
    });

    // Optional: also sync dispatch/disbursement fields
    const disbursedDate = form.getFieldValue("approval_disbursedDate");
    if (disbursedDate) {
      form.setFieldsValue({
        disbursement_date: dayjs(disbursedDate).format("YYYY-MM-DD"),
      });
    }
  }, [
    form,
    Form.useWatch("approval_status", form),
    Form.useWatch("approval_bankName", form),
    Form.useWatch("approval_loanAmountDisbursed", form),
    Form.useWatch("approval_roi", form),
    Form.useWatch("approval_tenureMonths", form),
    Form.useWatch("approval_processingFees", form),
    Form.useWatch("__postfileSeeded", form),
  ]);

  // header info
  const headerInfo = {
    customer: form.getFieldValue("customerName"),
    mobile: form.getFieldValue("primaryMobile"),
    vehicle: [
      form.getFieldValue("vehicleMake"),
      form.getFieldValue("vehicleModel"),
      form.getFieldValue("vehicleVariant"),
    ]
      .filter(Boolean)
      .join(" "),
    finance: form.getFieldValue("financeExpectation"),
    loanType: form.getFieldValue("typeOfLoan"),
  };

  useEffect(() => {
    form.setFieldsValue({ approval_banksData: banksData });
  }, [banksData, form]);

  const StickyHeader = () => (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "#f8f3ff",
        borderBottom: "1px solid #e6e0f3",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ padding: "10px 16px" }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
          Create Loan
        </div>

        <div style={{ marginBottom: 8 }}>
          <Space size={6} wrap>
            <Tag icon={<UserOutlined />}>
              {headerInfo.customer || "Customer"}
            </Tag>
            <Tag icon={<PhoneOutlined />}>{headerInfo.mobile || "Mobile"}</Tag>
            <Tag icon={<CarOutlined />}>{headerInfo.vehicle || "Vehicle"}</Tag>
            {isFinancedValue === "Yes" && (
              <Tag icon={<DollarOutlined />}>
                {headerInfo.loanType || "Loan"} •{" "}
                {headerInfo.finance || "Amount"}
              </Tag>
            )}
          </Space>
        </div>

        <Space size={6} wrap>
          {STEPS.filter((step) =>
            isFinancedValue === "Yes"
              ? true
              : step.key === "profile" || step.key === "delivery"
          ).map((step) => {
            const active = step.key === activeStep;
            return (
              <div
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                style={{
                  cursor: "pointer",
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  background: active ? "#ffffff" : "#f1ecff",
                  border: active
                    ? "1px solid #b7a7ff"
                    : "1px solid transparent",
                  color: active ? "#1d39c4" : "#595959",
                }}
              >
                {step.label}
              </div>
            );
          })}
          {/* ADD THE EXTRACT BUTTON HERE ↓ */}
          <button
            onClick={() => {
              const allFields = form.getFieldsValue(true);
              console.log("=== ALL FORM FIELDS ===", allFields);
              navigator.clipboard.writeText(JSON.stringify(allFields, null, 2));
              const blob = new Blob([JSON.stringify(allFields, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `loan-form-data-${Date.now()}.json`;
              a.click();
              alert("Form data copied to clipboard and downloaded!");
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 16,
              fontSize: 12,
              background: "#52c41a",
              border: "1px solid #52c41a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Extract JSON
          </button>
        </Space>
      </div>
    </div>
  );

  const handleApprovalNext = () => {
    setActiveStep("postfile");
  };

  // ADD ALL THESE FUNCTIONS HERE ↓

  const generateLoanId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, "0");
    return `LN-${year}-${random}`;
  };

  const handleSaveLoan = (shouldExit = false, extraData = {}) => {
    syncPrimaryApprovalToForm();
    console.log("💾 Save button clicked");

    try {
      const allFields = {
        ...form.getFieldsValue(true),
        ...extraData, // ✅ FORCE MERGE data passed from approval stage
      };

      console.log("📦 Raw form fields:", allFields);

      // Function to recursively convert all dates to strings
      const convertDatesToStrings = (obj) => {
        if (!obj) return obj;

        if (Array.isArray(obj)) {
          return obj.map((item) => convertDatesToStrings(item));
        }

        if (typeof obj === "object") {
          // ✅ dayjs
          if (dayjs.isDayjs(obj)) {
            return obj.toISOString();
          }

          // moment
          if (obj._isAMomentObject) {
            return obj.toISOString();
          }

          // JS Date
          if (obj instanceof Date) {
            return obj.toISOString();
          }

          // Recursively process object properties
          const result = {};
          for (const key in obj) {
            result[key] = convertDatesToStrings(obj[key]);
          }
          return result;
        }

        return obj;
      };

      const sanitizedData = convertDatesToStrings(allFields);
      console.log("🧹 Sanitized data:", sanitizedData);

      if (!sanitizedData.loanId) {
        sanitizedData.loanId = generateLoanId();
        form.setFieldsValue({ loanId: sanitizedData.loanId });
      }

      const loanData = {
        ...sanitizedData,
        id: sanitizedData.loanId,
        currentStage: activeStep,

        // ✅ IMPORTANT: Always persist isFinanced properly
        isFinanced: sanitizedData.isFinanced === "No" ? "No" : "Yes",

        status:
          sanitizedData.approval_status || sanitizedData.status || "Pending",
        aging: 0,
        priority: "normal",
        updatedAt: new Date().toISOString(),
        createdAt: sanitizedData.createdAt || new Date().toISOString(),
      };

      const existingLoans = JSON.parse(
        localStorage.getItem("savedLoans") || "[]"
      );
      const existingIndex = existingLoans.findIndex(
        (l) => l.loanId === loanData.loanId
      );

      if (existingIndex >= 0) {
        existingLoans[existingIndex] = loanData;
        console.log("✏️ Updated existing loan");
      } else {
        existingLoans.push(loanData);
        console.log("➕ Added new loan");
      }

      localStorage.setItem("savedLoans", JSON.stringify(existingLoans));
      console.log("✅ SAVED LOAN ID:", loanData.loanId);
      console.log("✅ SAVED LOAN DATA:", loanData);

      const verify = JSON.parse(localStorage.getItem("savedLoans") || "[]");
      console.log("🔍 VERIFY savedLoans after save:", verify);

      console.log("✅ Total saved loans:", existingLoans.length);
      alert(`Loan ${loanData.loanId} saved successfully!`);

      if (shouldExit) {
        const isEditMode = window.location.pathname.includes("/edit");
        if (!isEditMode) {
          localStorage.setItem("loanDraft", JSON.stringify(sanitizedData));
        }

        window.location.href = "/loans";
      }
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Error: " + error.message);
    }
  };

  // Add after handleSaveLoan function

  const handlePrint = () => {
    window.print();
  };

  const handleDiscard = () => {
    if (
      window.confirm(
        "Are you sure you want to discard all changes? This cannot be undone."
      )
    ) {
      localStorage.removeItem("editingLoan");
      localStorage.removeItem("editingLoanId");
      localStorage.removeItem("loanDraft"); // ✅ add this
      form.resetFields();
      window.location.href = "/loans";
    }
  };

  const handleProcessLoan = () => {
    if (isFinancedValue === "No") {
      handleSaveLoan(false);
      setActiveStep("delivery");
      return;
    }

    handleSaveLoan(false);
    setActiveStep("prefile");
  };

  const handleMoveToApproval = () => {
    if (isFinancedValue === "No") {
      setActiveStep("delivery");
      handleSaveLoan(false);
      return;
    }

    handleSaveLoan(false);
    setActiveStep("approval");
  };

  const handleDisburseLoan = (bankId, disbursementDate) => {
    const bankToDisburse = banksData.find((b) => b.id === bankId);

    if (!bankToDisburse) {
      alert("Bank not found");
      return;
    }

    const updatedBanks = banksData.map((bank) => {
      if (bank.id === bankId) {
        return {
          ...bank,
          status: "Disbursed",
          disbursedDate: disbursementDate,
          statusHistory: [
            ...(bank.statusHistory || []),
            {
              status: "Disbursed",
              changedAt: new Date(disbursementDate).toISOString(),
              note: "Loan disbursed",
            },
          ],
        };
      }
      return bank;
    });

    setBanksData(updatedBanks);

    const cleanNumber = (val) =>
      Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;

    // ONLY set non-date fields
    form.setFieldsValue({
      approval_bankId: bankToDisburse.id,
      approval_bankName: bankToDisburse.bankName || "",
      approval_status: "Disbursed",
      approval_loanAmountApproved: cleanNumber(bankToDisburse.loanAmount),
      approval_loanAmountDisbursed: cleanNumber(bankToDisburse.loanAmount),
      approval_roi: Number(bankToDisburse.interestRate) || undefined,
      approval_tenureMonths: Number(bankToDisburse.tenure) || undefined,
      approval_processingFees: cleanNumber(bankToDisburse.processingFee),
      // DON'T set approval_statusHistory - it causes date errors
      approval_breakup_netLoanApproved:
        bankToDisburse.breakupNetLoanApproved || 0,
      approval_breakup_creditAssured: bankToDisburse.breakupCreditAssured || 0,
      approval_breakup_insuranceFinance:
        bankToDisburse.breakupInsuranceFinance || 0,
      approval_breakup_ewFinance: bankToDisburse.breakupEwFinance || 0,
      payoutPercentage: bankToDisburse.payoutPercent || "",
      __postfileSeeded: true,
      postfile_bankName: bankToDisburse.bankName || "",
      postfile_loanAmountDisbursed: cleanNumber(bankToDisburse.loanAmount),
      postfile_roi: Number(bankToDisburse.interestRate) || undefined,
      postfile_tenureMonths: Number(bankToDisburse.tenure) || undefined,
      postfile_processingFees: cleanNumber(bankToDisburse.processingFee),
    });

    console.log("✅ Bank details saved, moving to Post-File");

    // Just move to next stage
    setActiveStep("postfile");
  };

  const handleMoveToDelivery = () => {
    handleSaveLoan(false);
    setActiveStep("delivery");
  };

  const handleCloseLead = () => {
    // Mark as completed
    form.setFieldsValue({
      status: "Completed",
      completedDate: dayjs(),
    });

    // Save and exit
    handleSaveLoan(true);
  };

  const handleNextStage = () => {
    const stageOrder = [
      "profile",
      "prefile",
      "approval",
      "postfile",
      "delivery",
      "payout",
    ];

    const currentIndex = stageOrder.indexOf(activeStep);
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];

      // CASH CAR: skip payout and finish at delivery
      if (isFinancedValue === "No") {
        if (
          nextStage === "prefile" ||
          nextStage === "approval" ||
          nextStage === "postfile"
        ) {
          setActiveStep("delivery");
          handleSaveLoan(false);
          return;
        }

        if (nextStage === "payout") {
          // no payout for cash car
          return;
        }
      }

      setActiveStep(nextStage);
      handleSaveLoan(false);
    }
  };

  const handlePreviousStage = () => {
    const stageOrder = [
      "profile",
      "prefile",
      "approval",
      "postfile",
      "delivery",
      "payout",
    ];

    const currentIndex = stageOrder.indexOf(activeStep);
    if (currentIndex > 0) {
      const prevStage = stageOrder[currentIndex - 1];

      // CASH CAR: skip finance stages
      if (isFinancedValue === "No") {
        if (
          prevStage === "postfile" ||
          prevStage === "approval" ||
          prevStage === "prefile"
        ) {
          setActiveStep("profile");
          return;
        }
      }

      setActiveStep(prevStage);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case "profile":
        return (
          <>
            <LeadDetails />
            <VehicleDetailsForm />
            <FinanceDetailsForm />
            <PersonalDetailsWithSearch
              excludeFields={isFinancedValue !== "Yes"}
            />
            {isFinancedValue === "Yes" && (
              <>
                <EmploymentDetails />
                <IncomeDetails />
                <BankDetails />
                <ReferenceDetails />
                <KycDetails />
              </>
            )}
          </>
        );

      case "prefile":
        return (
          <>
            <PersonalDetailsPreFile />
            <OccupationalDetailsPreFile />
            <IncomeBankingDetailsPreFile />
            <VehiclePricingLoanDetails />
            <ReferenceDetails />
            <KycDetails />
            <Section7RecordDetails />
            <CoApplicantSection />
            <GuarantorSection />
            <AuthorisedSignatorySection />
          </>
        );

      case "approval":
        // pass banksData + setter + onNext
        return (
          <LoanApprovalStep
            form={form}
            banksData={banksData}
            setBanksData={setBanksData}
            onNext={handleApprovalNext}
          />
        );

      case "postfile":
        // pass banksData if PostFileStep ever needs it (for timeline, etc.)
        return <PostFileStep form={form} banksData={banksData} />;

      case "delivery":
        return <VehicleDeliveryStep form={form} />;

      case "payout": // ADD THIS CASE
        return <PayoutSection form={form} />;

      default:
        return null;
    }
  };

  const syncPrimaryApprovalToForm = () => {
    // pick the best bank to sync:
    // 1) Disbursed bank
    // 2) Approved bank
    // 3) fallback: first bank
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
        primaryBank.disbursedAmount || primaryBank.loanAmount
      ),

      approval_roi: Number(primaryBank.interestRate) || undefined,
      approval_tenureMonths: Number(primaryBank.tenure) || undefined,
      approval_processingFees: cleanNumber(primaryBank.processingFee),

      approval_approvalDate: approvalDate,
      approval_disbursedDate: disbursedDate,

      approval_breakup_netLoanApproved: primaryBank.breakupNetLoanApproved ?? 0,
      approval_breakup_creditAssured: primaryBank.breakupCreditAssured ?? 0,
      approval_breakup_insuranceFinance:
        primaryBank.breakupInsuranceFinance ?? 0,
      approval_breakup_ewFinance: primaryBank.breakupEwFinance ?? 0,

      payoutPercentage: primaryBank.payoutPercent || "",
    });
  };

  const isCashCase = isFinancedValue === "No";

  return (
    <Form
      form={form}
      layout="vertical"
      preserve
      onValuesChange={() => {
        const allFields = form.getFieldsValue(true);

        const convertDatesToStrings = (obj) => {
          if (!obj) return obj;

          if (Array.isArray(obj)) {
            return obj.map((item) => convertDatesToStrings(item));
          }

          if (typeof obj === "object") {
            if (dayjs.isDayjs(obj)) return obj.toISOString();
            if (obj instanceof Date) return obj.toISOString();

            const result = {};
            for (const key in obj) {
              result[key] = convertDatesToStrings(obj[key]);
            }
            return result;
          }

          return obj;
        };

        const sanitized = convertDatesToStrings(allFields);

        // Save only in NEW mode
        const isEditMode = window.location.pathname.includes("/edit");
        if (!isEditMode) {
          localStorage.setItem("loanDraft", JSON.stringify(sanitized));
        }
      }}
      style={{ margin: 0, padding: 0 }}
    >
      {/* 🔽 ADD THIS BLOCK (hidden approval fields) */}
      <Form.Item name="approval_bankId" hidden />
      <Form.Item name="approval_approvalDate" hidden />
      <Form.Item name="loan_notes" hidden />

      <Form.Item name="approval_bankName" hidden />
      <Form.Item name="approval_status" hidden />
      <Form.Item name="approval_loanAmountApproved" hidden />
      <Form.Item name="approval_loanAmountDisbursed" hidden />
      <Form.Item name="approval_roi" hidden />
      <Form.Item name="approval_tenureMonths" hidden />
      <Form.Item name="approval_processingFees" hidden />
      <Form.Item name="approval_statusHistory" hidden />
      <Form.Item name="approval_disbursedDate" hidden />
      <Form.Item name="approval_breakup_netLoanApproved" hidden />
      <Form.Item name="approval_breakup_creditAssured" hidden />
      <Form.Item name="approval_breakup_insuranceFinance" hidden />
      <Form.Item name="delivery_invoiceFile" hidden />
      <Form.Item name="delivery_rcFile" hidden />
      <Form.Item name="postfile_documents" hidden />

      <Form.Item name="approval_breakup_ewFinance" hidden />
      <Form.Item name="postfile_approvalDate" hidden />
      <Form.Item name="postfile_bankName" hidden />
      <Form.Item name="__postfileLocked" hidden />
      <Form.Item name="approval_banksData" hidden />

      <Form.Item name="postfile_loanAmountDisbursed" hidden />
      <Form.Item name="postfile_roi" hidden />
      <Form.Item name="postfile_tenureMonths" hidden />
      <Form.Item name="postfile_processingFees" hidden />
      <Form.Item name="postfile_roiType" hidden />
      <Form.Item name="postfile_emiMode" hidden />
      <Form.Item name="postfile_emiPlan" hidden />
      <Form.Item name="postfile_emiAmount" hidden />
      <Form.Item name="loanId" hidden />
      <Form.Item name="createdAt" hidden />
      <Form.Item name="updatedAt" hidden />
      <Form.Item name="currentStage" hidden />
      <Form.Item name="postfile_firstEmiDate" hidden />
      <Form.Item name="postfile_disbursedLoan" hidden />
      <Form.Item name="postfile_disbursedCreditAssured" hidden />
      <Form.Item name="postfile_disbursedInsurance" hidden />
      <Form.Item name="postfile_disbursedEw" hidden />
      <Form.Item name="postfile_creditAssured" hidden />
      <Form.Item name="postfile_insuranceFinance" hidden />
      <Form.Item name="postfile_ewFinance" hidden />
      <Form.Item name="__postfileVehicleSeeded" hidden />
      <Form.Item name="postfile_regd_city" hidden />

      {/* (optional but safe) */}
      <Form.Item name="__postfileSeeded" hidden />
      <Form.Item name="__postfileDisbursalSeeded" hidden />
      <Form.Item name="instrumentType" hidden />
      <Form.Item name="__postfileVehicleSeeded" hidden />
      <Form.Item name="dispatch_date" hidden />
      <Form.Item name="dispatch_time" hidden />
      <Form.Item name="dispatch_through" hidden />
      <Form.Item name="disbursement_date" hidden />
      <Form.Item name="disbursement_time" hidden />
      <Form.Item name="loan_number" hidden />
      <Form.Item name="docs_prepared_by" hidden />
      <Form.Item name="__dispatchInitialized" hidden />
      <Form.Item name="delivery_date" hidden />
      <Form.Item name="delivery_dealerName" hidden />
      <Form.Item name="delivery_dealerContactPerson" hidden />
      <Form.Item name="delivery_dealerContactNumber" hidden />
      <Form.Item name="delivery_dealerAddress" hidden />
      <Form.Item name="delivery_by" hidden />
      <Form.Item name="insurance_by" hidden />
      <Form.Item name="insurance_company_name" hidden />
      <Form.Item name="insurance_policy_number" hidden />
      <Form.Item name="invoice_number" hidden />
      <Form.Item name="invoice_date" hidden />
      <Form.Item name="invoice_received_as" hidden />
      <Form.Item name="invoice_received_from" hidden />
      <Form.Item name="invoice_received_date" hidden />
      <Form.Item name="rc_redg_no" hidden />
      <Form.Item name="rc_chassis_no" hidden />
      <Form.Item name="rc_engine_no" hidden />
      <Form.Item name="loan_receivables" hidden />
      <Form.Item name="prefile_sourcePayoutPercentage" hidden />
      <Form.Item name="recordSource" hidden />
      <Form.Item name="sourceName" hidden />
      <Form.Item name="payoutApplicable" hidden />
      <Form.Item name="dealerMobile" hidden />
      <Form.Item name="dealerAddress" hidden />
      <Form.Item name="referenceDetails" hidden />
      <Form.Item name="dealtBy" hidden />
      <Form.Item name="docsPreparedBy" hidden />
      <Form.Item name="loan_payables" hidden />
      <Form.Item name="__payoutAutoCreated" hidden />
      <Form.Item name="rc_redg_date" hidden />
      <Form.Item name="rc_received_as" hidden />
      <Form.Item name="rc_received_from" hidden />
      <Form.Item name="rc_received_date" hidden />
      <Form.Item name="__deliveryInitialized" hidden />
      <Form.Item name="status" hidden />
      <Form.Item name="completedDate" hidden />
      <Form.Item name="loan_payouts" hidden />

      <Form.Item name="payoutPercentage" hidden />

      <LoanStickyHeader
        title="Create Loan"
        activeStep={activeStep}
        onStepChange={setActiveStep}
        isFinanced={isFinancedValue}
        form={form}
        isDisbursed={form?.getFieldValue("approval_status") === "Disbursed"} // ADD THIS
        onSave={() => handleSaveLoan(false)}
        onExit={() => handleSaveLoan(true)}
      />

      {/* ADD WRAPPER WITH PADDING ↓ */}
      <div style={{ padding: "0 24px 24px 24px" }}>{renderStep()}</div>

      {/* ADD THIS ↓ */}
      <StageFooter
        currentStage={activeStep}
        isFinanced={isFinancedValue}
        onSave={() => handleSaveLoan(false)}
        onSaveAndExit={() => {
          // ✅ ALWAYS sync latest approval values from banksData to form
          syncPrimaryApprovalToForm();

          // now save and exit
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
        form={form} // ADD THIS so StageFooter can access form
      />
    </Form>
  );
};

export default LoanFormWithSteps;
