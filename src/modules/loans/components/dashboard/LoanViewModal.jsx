import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tabs, Form } from "antd";
import Input from "../../../../components/ui/Input";
import dayjs from "dayjs";

// import your existing step components (REAL PATHS)
import LeadDetails from "../loan-form/customer-profile/LeadDetails";
import VehicleDetailsForm from "../loan-form/customer-profile/VehicleDetailsForm";
import FinanceDetailsForm from "../loan-form/customer-profile/FinanceDetailsForm";
import PersonalDetailsWithSearch from "../loan-form/PersonalDetailsWithSearch";

import EmploymentDetails from "../../../customers/customer-form/EmploymentDetails";
import IncomeDetails from "../../../customers/customer-form/IncomeDetails";
import BankDetails from "../../../customers/customer-form/BankDetails";
import ReferenceDetails from "../../../customers/customer-form/ReferenceDetails";
import KycDetails from "../../../customers/customer-form/KycDetails";

import PersonalDetailsPreFile from "../loan-form/pre-file/PersonalDetailsPreFile";
import OccupationalDetailsPreFile from "../loan-form/pre-file/OccupationalDetailsPreFile";
import IncomeBankingDetailsPreFile from "../loan-form/pre-file/IncomeBankingDetailsPreFile";
import VehiclePricingLoanDetails from "../loan-form/pre-file/VehiclePricingLoanDetails";
import Section7RecordDetails from "../loan-form/pre-file/Section7RecordDetails";
import CoApplicantSection from "../loan-form/pre-file/CoApplicantSection";
import GuarantorSection from "../loan-form/pre-file/GuarantorSection";
import AuthorisedSignatorySection from "../loan-form/pre-file/AuthorisedSignatorySection";

import LoanApprovalStep from "../loan-form/loan-approval/LoanApprovalStep";
import PostFileStep from "../loan-form/post-file/PostFileStep";
import VehicleDeliveryStep from "../loan-form/vehicle-delivery/VehicleDeliveryStep";
import PayoutSection from "../loan-form/payout/PayoutSection";

// ----------------------------
// helpers to prevent date crash
// ----------------------------
const toDayjs = (val) => {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val;

  const d = dayjs(val);
  return d.isValid() ? d : null;
};

const convertDatesToDayjsDeep = (obj) => {
  if (!obj) return obj;

  if (dayjs.isDayjs(obj)) return obj;

  if (Array.isArray(obj)) return obj.map(convertDatesToDayjsDeep);

  if (typeof obj === "object") {
    const out = {};
    for (const k in obj) {
      const key = k.toLowerCase();
      if (key.includes("date") || key.includes("time") || key.includes("dob")) {
        out[k] = toDayjs(obj[k]);
      } else {
        out[k] = convertDatesToDayjsDeep(obj[k]);
      }
    }
    return out;
  }

  return obj;
};

const LoanViewModal = ({ open, loan, onClose }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");

  const matches = (text) => {
    if (!searchQuery) return true;
    return (text || "")
      .toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  };

  // Searchable full loan text
  const searchableText = useMemo(() => {
    return JSON.stringify(loan || {}).toLowerCase();
  }, [loan]);

  const hasSearchResults = useMemo(() => {
    if (!searchQuery) return true;
    return searchableText.includes(searchQuery.toLowerCase());
  }, [searchQuery, searchableText]);

  useEffect(() => {
    if (!loan) return;

    const fixedLoan = convertDatesToDayjsDeep(loan);
    form.setFieldsValue(fixedLoan);

    setActiveTab(loan.currentStage || "profile");
  }, [loan, form]);

  // Tabs definition (we keep searchText internally but DO NOT show it in UI)
  const tabItems = useMemo(() => {
    if (!loan) return [];

    const tabs = [
      {
        key: "profile",
        label: "Customer Profile",
        searchText: searchableText,
        children: (
          <>
            <LeadDetails readOnly />
            <VehicleDetailsForm readOnly />
            <FinanceDetailsForm readOnly />
            <PersonalDetailsWithSearch readOnly />

            {loan?.isFinanced === "Yes" && (
              <>
                <EmploymentDetails readOnly />
                <IncomeDetails readOnly />
                <BankDetails readOnly />
                <ReferenceDetails readOnly />
                <KycDetails readOnly />
              </>
            )}
          </>
        ),
      },
      {
        key: "prefile",
        label: "Pre-File",
        searchText: JSON.stringify({
          recordSource: loan.recordSource,
          sourceName: loan.sourceName,
          dealerMobile: loan.dealerMobile,
          payoutApplicable: loan.payoutApplicable,
          prefile_sourcePayoutPercentage: loan.prefile_sourcePayoutPercentage,
        }),
        children: (
          <>
            <PersonalDetailsPreFile readOnly />
            <OccupationalDetailsPreFile readOnly />
            <IncomeBankingDetailsPreFile readOnly />
            <VehiclePricingLoanDetails readOnly />
            <Section7RecordDetails readOnly />
            <CoApplicantSection readOnly />
            <GuarantorSection readOnly />
            <AuthorisedSignatorySection readOnly />
          </>
        ),
      },
      {
        key: "approval",
        label: "Loan Approval",
        searchText: JSON.stringify({
          approval_bankName: loan.approval_bankName,
          approval_status: loan.approval_status,
          payoutPercentage: loan.payoutPercentage,
          approval_banksData: loan.approval_banksData,
        }),
        children: (
          <LoanApprovalStep
            form={form}
            banksData={loan?.approval_banksData || []}
            setBanksData={() => {}}
            onNext={() => {}}
            readOnly
          />
        ),
      },
      {
        key: "postfile",
        label: "Post-File",
        searchText: JSON.stringify({
          postfile_bankName: loan.postfile_bankName,
          postfile_roi: loan.postfile_roi,
          postfile_emiAmount: loan.postfile_emiAmount,
          instrumentType: loan.instrumentType,
        }),
        children: <PostFileStep form={form} readOnly />,
      },
      {
        key: "delivery",
        label: "Vehicle Delivery",
        searchText: JSON.stringify({
          delivery_date: loan.delivery_date,
          invoice_number: loan.invoice_number,
          rc_redg_no: loan.rc_redg_no,
          insurance_company_name: loan.insurance_company_name,
        }),
        children: <VehicleDeliveryStep form={form} readOnly />,
      },
      {
        key: "payout",
        label: "Payout",
        searchText: JSON.stringify({
          approval_status: loan.approval_status,
          loan_receivables: loan.loan_receivables,
          loan_payables: loan.loan_payables,
        }),
        children: <PayoutSection form={form} readOnly />,
      },
    ];

    // Filter tabs based on search
    return tabs.filter((t) => matches(t.label) || matches(t.searchText));
  }, [loan, searchQuery]);

  // Auto switch to first available tab after filtering
  useEffect(() => {
    if (!searchQuery) return;
    if (!tabItems.length) return;

    const stillExists = tabItems.some((t) => t.key === activeTab);
    if (!stillExists) {
      setActiveTab(tabItems[0].key);
    }
  }, [searchQuery, tabItems, activeTab]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1300}
      centered
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      {/* HEADER */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          Loan Case View (Read Only) — {loan?.loanId || ""}
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          All steps are visible exactly like the loan form, but locked.
        </div>
      </div>

      {/* GLOBAL SEARCH */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f0f0f0" }}>
        <Input
          type="search"
          placeholder="Search anywhere in this loan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {!hasSearchResults && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#ff4d4f" }}>
            No matching results found.
          </div>
        )}

        {searchQuery && tabItems.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            Showing {tabItems.length} matching section(s)
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div
        style={{
          padding: 16,
          background: "#fafafa",
          maxHeight: "75vh",
          overflowY: "auto",
        }}
      >
        <Form form={form} layout="vertical" disabled>
          {tabItems.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                No sections matched your search
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                Try searching by bank name, customer name, mobile number,
                payout, dealer, etc.
              </div>
            </div>
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />
          )}
        </Form>
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: "10px 18px",
          borderTop: "1px solid #f0f0f0",
          textAlign: "right",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: "6px 16px",
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default LoanViewModal;
