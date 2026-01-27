// src/modules/loans/components/LoanFormWithSteps.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form } from "antd";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";
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
import PayoutSection from "./loan-form/payout/PayoutSection";

import LoanStickyHeader from "./LoanStickyHeader";
import StageFooter from "./StageFooter";

dayjs.extend(customParseFormat);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

// ----------------------------
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
    const d = dayjs(value);
    return d.isValid() ? d : value;
  }

  if (Array.isArray(value)) return value.map(convertAnyDateToDayjsDeep);

  if (typeof value === "object") {
    const out = {};
    for (const k in value) out[k] = convertAnyDateToDayjsDeep(value[k]);
    return out;
  }

  return value;
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

const STEPS = [
  { key: "profile", label: "Customer Profile" },
  { key: "prefile", label: "Pre-File" },
  { key: "approval", label: "Loan Approval" },
  { key: "postfile", label: "Post-File" },
  { key: "delivery", label: "Vehicle Delivery" },
  { key: "payout", label: "Payout" },
];

const LoanFormWithSteps = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const loanIdFromRoute = params?.loanId;
  const isEditMode = useMemo(() => {
    return Boolean(loanIdFromRoute) || location.pathname.includes("/edit/");
  }, [loanIdFromRoute, location.pathname]);

  const [activeStep, setActiveStep] = useState("profile");

  // banksData must persist across steps
  const [banksData, setBanksData] = useState([]);

  // finance flag
  const watchedIsFinanced = Form.useWatch("isFinanced", form);
  const isFinancedValue = watchedIsFinanced === "No" ? "No" : "Yes";
  const isCashCase = isFinancedValue === "No";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ----------------------------
  // API helpers
  // ----------------------------
  const fetchLoanById = useCallback(async (loanId) => {
    if (!loanId) return null;

    const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}`);
    if (!res.ok) throw new Error("Failed to load loan");

    const json = await res.json();
    return json?.data || null;
  }, []);

  const createLoan = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE_URL}/api/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.error || "Failed to create loan");
    }

    return json?.data || null;
  }, []);

  const updateLoan = useCallback(async (loanId, payload) => {
    const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.error || "Failed to update loan");
    }

    return json?.data || null;
  }, []);

  // ----------------------------
  // Load existing loan (EDIT MODE)
  // ----------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!isEditMode || !loanIdFromRoute) return;

      try {
        setLoading(true);

        const loan = await fetchLoanById(loanIdFromRoute);
        if (!mounted) return;

        const fixed = convertAnyDateToDayjsDeep(loan || {});
        form.setFieldsValue(fixed);

        if (Array.isArray(loan?.approval_banksData)) {
          setBanksData(loan.approval_banksData);
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
  }, [isEditMode, loanIdFromRoute, fetchLoanById, form]);

  // default isFinanced
  useEffect(() => {
    if (!form.getFieldValue("isFinanced")) {
      form.setFieldsValue({ isFinanced: "Yes" });
    }
  }, [form]);

  // Cash default type
  useEffect(() => {
    if (isFinancedValue === "No") {
      const currentType = form.getFieldValue("typeOfLoan");
      if (!currentType) form.setFieldsValue({ typeOfLoan: "New Car" });
    }
  }, [isFinancedValue, form]);

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
  const buildLoanPayload = useCallback(
    (extra = {}) => {
      syncPrimaryApprovalToForm();

      const raw = {
        ...form.getFieldsValue(true),
        ...extra,
      };

      const sanitized = convertDatesToStringsDeep(raw);

      const payload = {
        ...sanitized,
        currentStage: activeStep,
        isFinanced: sanitized?.isFinanced === "No" ? "No" : "Yes",
        approval_banksData: banksData,
        updatedAt: new Date().toISOString(),
      };

      // if new create, backend should set createdAt
      return payload;
    },
    [activeStep, banksData, form, syncPrimaryApprovalToForm],
  );

  const handleSaveLoan = useCallback(
    async (shouldExit = false, extraData = {}) => {
      try {
        setSaving(true);

        const payload = buildLoanPayload(extraData);

        // CREATE
        if (!isEditMode) {
          const created = await createLoan(payload);

          const newLoanId = created?._id;
          if (!newLoanId) {
            throw new Error("Loan created but loanId not returned");
          }

          form.setFieldsValue({
            loanId: newLoanId,
            createdAt: created?.createdAt || new Date().toISOString(),
          });

          if (shouldExit) {
            navigate("/loans");
          } else {
            // move to edit route after create (so future saves are PUT)
            navigate(`/loans/edit/${newLoanId}`, { replace: true });
          }

          return;
        }

        // UPDATE
        const loanId = loanIdFromRoute || form.getFieldValue("loanId");
        if (!loanId) throw new Error("loanId missing for update");

        await updateLoan(loanId, payload);

        if (shouldExit) navigate("/loans");
      } catch (e) {
        console.error("Save failed:", e);
        alert(`Save failed ❌\n${e.message}`);
      } finally {
        setSaving(false);
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

  const handleProcessLoan = () => {
    // no field logic change
    handleSaveLoan(false);
    if (isCashCase) setActiveStep("delivery");
    else setActiveStep("prefile");
  };

  const handleMoveToApproval = () => {
    handleSaveLoan(false);
    if (isCashCase) setActiveStep("delivery");
    else setActiveStep("approval");
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

    setActiveStep("postfile");
  };

  const handleMoveToDelivery = () => {
    handleSaveLoan(false);
    setActiveStep("delivery");
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
        return (
          <LoanApprovalStep
            form={form}
            banksData={banksData}
            setBanksData={setBanksData}
            onNext={handleApprovalNext}
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


  return (
    <Form
      form={form}
      layout="vertical"
      preserve
      style={{ margin: 0, padding: 0 }}
    >
      <HiddenFields />

      {/* ✅ MAIN WRAPPER: keeps header, form, footer same width */}
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <LoanStickyHeader
          title={headerTitle}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          isFinanced={isFinancedValue}
          form={form}
          isDisbursed={form?.getFieldValue("approval_status") === "Disbursed"}
          onSave={() => handleSaveLoan(false)}
          onExit={() => handleSaveLoan(true)}
        />

        {/* Form Body */}
        <div style={{ padding: "0 0 24px 0" }}>{renderStep()}</div>

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

      {/* Optional small saving indicator (doesn't affect UI) */}
      {saving && (
        <div className="fixed bottom-20 right-4 z-[950] bg-card border border-border rounded-xl px-3 py-2 shadow-elevation-2 text-xs text-muted-foreground">
          Saving...
        </div>
      )}
    </Form>
  );
};

export default LoanFormWithSteps;
