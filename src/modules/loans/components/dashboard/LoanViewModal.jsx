import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tabs, Form, Spin } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";

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

const LoanViewModal = ({ open, loan, onClose, initialTab }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [fullLoan, setFullLoan] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(false);

  const loanId = loan?._id || loan?.loanId;
  const displayLoan = fullLoan || loan;

  // When modal opens, fetch full loan by ID so we have latest data (including documents)
  useEffect(() => {
    if (!open || !loanId) {
      if (!open) setFullLoan(null);
      return;
    }
    let cancelled = false;
    setLoadingLoan(true);
    loansApi
      .getById(loanId)
      .then((res) => {
        if (cancelled) return;
        const body = res?.data ?? res;
        const loanData = body?.data ?? body;
        if (loanData) setFullLoan(convertDatesToDayjsDeep(loanData));
      })
      .catch(() => {
        if (!cancelled) setFullLoan(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingLoan(false);
      });
    return () => { cancelled = true; };
  }, [open, loanId]);

  const matches = React.useCallback((text) => {
    if (!searchQuery) return true;
    return (text || "")
      .toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  const searchableText = useMemo(() => {
    return JSON.stringify(displayLoan || {}).toLowerCase();
  }, [displayLoan]);

  const hasSearchResults = useMemo(() => {
    if (!searchQuery) return true;
    return searchableText.includes(searchQuery.toLowerCase());
  }, [searchQuery, searchableText]);

  useEffect(() => {
    if (!displayLoan) return;

    const fixedLoan = convertDatesToDayjsDeep(displayLoan);
    form.setFieldsValue(fixedLoan);

    setActiveTab(initialTab || displayLoan.currentStage || "profile");
  }, [displayLoan, form, initialTab]);

  const tabItems = useMemo(() => {
    if (!displayLoan) return [];

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

            {/* Show extended details if they belong to the customer profile */}
            <>
              <EmploymentDetails readOnly />
              <IncomeDetails readOnly />
              <BankDetails readOnly />
              <ReferenceDetails readOnly />
              <KycDetails readOnly />
            </>
          </>
        ),
      },
      {
        key: "prefile",
        label: "Pre-File",
        searchText: JSON.stringify({
          recordSource: displayLoan.recordSource,
          sourceName: displayLoan.sourceName,
          dealerMobile: displayLoan.dealerMobile,
          payoutApplicable: displayLoan.payoutApplicable,
          prefile_sourcePayoutPercentage: displayLoan.prefile_sourcePayoutPercentage,
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
          approval_bankName: displayLoan.approval_bankName,
          approval_status: displayLoan.approval_status,
          payoutPercentage: displayLoan.payoutPercentage,
          approval_banksData: displayLoan.approval_banksData,
        }),
        children: (
          <LoanApprovalStep
            form={form}
            banksData={displayLoan?.approval_banksData || []}
            setBanksData={() => {}}
            onNext={() => {}}
            readOnly
            loanId={displayLoan?._id}
          />
        ),
      },
      {
        key: "postfile",
        label: "Post-File",
        searchText: JSON.stringify({
          postfile_bankName: displayLoan.postfile_bankName,
          postfile_roi: displayLoan.postfile_roi,
          postfile_emiAmount: displayLoan.postfile_emiAmount,
          instrumentType: displayLoan.instrumentType,
        }),
        children: <PostFileStep form={form} readOnly />,
      },
      {
        key: "delivery",
        label: "Vehicle Delivery",
        searchText: JSON.stringify({
          delivery_date: displayLoan.delivery_date,
          invoice_number: displayLoan.invoice_number,
          rc_redg_no: displayLoan.rc_redg_no,
          insurance_company_name: displayLoan.insurance_company_name,
        }),
        children: <VehicleDeliveryStep form={form} readOnly />,
      },
      {
        key: "payout",
        label: "Payout",
        searchText: JSON.stringify({
          approval_status: displayLoan.approval_status,
          loan_receivables: displayLoan.loan_receivables,
          loan_payables: displayLoan.loan_payables,
        }),
        children: <PayoutSection form={form} readOnly />,
      },
    ];

    // Filter tabs based on search
    return tabs.filter((t) => matches(t.label) || matches(t.searchText));
  }, [displayLoan, form, matches, searchableText]);

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
      closable={false}
      width={1000}
      centered
      className="theme-modal-clean"
      styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 20 } }}
      destroyOnHidden
    >
      <div className="flex flex-col h-[85vh] bg-background">
        {/* HEADER */}
        <div className="flex-none px-6 py-4 border-b border-border bg-background flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {loadingLoan ? <Spin size="small" /> : <Icon name="FileText" size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Loan Details</h2>
                <div className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  Read Only
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-medium">{displayLoan?.loanId || displayLoan?.loan_number || "New Case"}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{displayLoan?.customerName || "Unknown Customer"}</span>
                {(displayLoan?.caseType || displayLoan?.typeOfLoan || displayLoan?.loanType) && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {displayLoan?.caseType || displayLoan?.typeOfLoan || displayLoan?.loanType}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="flex-none px-6 py-3 border-b border-border bg-muted/30">
          <div className="relative max-w-md">
             <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input 
                type="text"
                placeholder="Search inside this loan (e.g. 'HDFC', 'Pan', 'Approved')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground"
             />
          </div>
          {searchQuery && (
             <div className="mt-2 text-xs pl-1">
                {hasSearchResults ? (
                    <span className="text-foreground">{tabItems.length} section(s) found</span>
                ) : (
                    <span className="text-muted-foreground">No results found in any section</span>
                )}
             </div>
          )}
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-6 custom-scrollbar">
            <Form form={form} layout="vertical" disabled className="h-full">
              {tabItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <Icon name="SearchX" size={48} className="text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No matches found</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                        We couldn't find any section containing "{searchQuery}". Try a different keyword.
                    </p>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto">
                    <Tabs
                      activeKey={activeTab}
                      onChange={setActiveTab}
                      items={tabItems}
                      type="card"
                      className="custom-tabs"
                    />
                </div>
              )}
            </Form>
        </div>
      </div>
      <style>{styles}</style>
    </Modal>
  );
}; 
  

// Add some CSS for the custom tabs to look transparent/pill like
const styles = `
  .custom-tabs .ant-tabs-nav::before {
     border-bottom: none !important;
  }
  .custom-tabs .ant-tabs-tab {
     background: transparent !important;
     border: none !important;
     font-weight: 500;
  }
  
  .custom-tabs .ant-tabs-tab:hover {
    opacity: 0.8;
  }

  .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
     font-weight: 600 !important;
  }
  
  /* Hide the card background of ant tabs */
  .custom-tabs .ant-tabs-content {
     margin-top: 16px;
  }
  
  /* Ensure disabled inputs are readable */
  .ant-input-disabled,
  .ant-input-number-disabled .ant-input-number-input,
  .ant-select-disabled .ant-select-selector,
  .ant-picker-disabled {
    color: hsl(var(--foreground)) !important;
    background-color: hsl(var(--muted) / 0.3) !important;
    border-color: hsl(var(--border)) !important;
    cursor: default !important;
  }
  
  .ant-input-disabled::placeholder,
  .ant-input-number-disabled .ant-input-number-input::placeholder {
    color: hsl(var(--muted-foreground)) !important;
  }
  
  /* Custom scrollbar for modal content */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent; 
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--border)); 
    border-radius: 20px;
  }
`;

export default LoanViewModal;
