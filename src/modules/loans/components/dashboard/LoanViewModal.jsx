import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Spin } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";

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
    Object.keys(obj).forEach((k) => {
      const key = k.toLowerCase();
      if (key.includes("date") || key.includes("time") || key.includes("dob")) {
        out[k] = toDayjs(obj[k]);
      } else {
        out[k] = convertDatesToDayjsDeep(obj[k]);
      }
    });
    return out;
  }
  return obj;
};

const getPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const fmtValue = (v) => {
  if (v == null || v === "") return "Not set";
  if (dayjs.isDayjs(v)) return v.format("DD MMM YYYY");
  if (Array.isArray(v)) return v.length ? v.join(", ") : "Not set";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const GLOBAL_SEARCH_FIELDS = [
  { label: "Loan Number", path: "loan_number", section: "profile" },
  { label: "Case ID", path: "loanId", section: "profile" },
  { label: "Customer Name", path: "customerName", section: "profile" },
  { label: "Primary Mobile", path: "primaryMobile", section: "profile" },
  { label: "Email", path: "email", section: "profile" },
  { label: "Aadhaar", path: "aadhaarNumber", section: "profile" },
  { label: "Aadhar", path: "aadharNumber", section: "profile" },
  { label: "PAN", path: "panNumber", section: "profile" },
  { label: "Address", path: "residenceAddress", section: "profile" },
  { label: "Permanent Address", path: "permanentAddress", section: "profile" },
  { label: "Vehicle Make", path: "vehicleMake", section: "profile" },
  { label: "Vehicle Model", path: "vehicleModel", section: "profile" },
  { label: "Vehicle Variant", path: "vehicleVariant", section: "profile" },
  { label: "Registration Number", path: "registrationNumber", section: "delivery" },
  { label: "RC Reg Number", path: "rc_redg_no", section: "delivery" },
  { label: "Record Source", path: "recordSource", section: "prefile" },
  { label: "Source Name", path: "sourceName", section: "prefile" },
  { label: "Dealer Name", path: "dealerName", section: "prefile" },
  { label: "Dealer Mobile", path: "dealerMobile", section: "prefile" },
  { label: "Approval Bank", path: "approval_bankName", section: "approval" },
  { label: "Approval Status", path: "approval_status", section: "approval" },
  { label: "Loan Amount Approved", path: "approval_loanAmountApproved", section: "approval" },
  { label: "Loan Amount Disbursed", path: "approval_loanAmountDisbursed", section: "approval" },
  { label: "Approval ROI", path: "approval_roi", section: "approval" },
  { label: "Approval Tenure", path: "approval_tenureMonths", section: "approval" },
  { label: "Post-File Bank", path: "postfile_bankName", section: "postfile" },
  { label: "Post-File EMI", path: "postfile_emiAmount", section: "postfile" },
  { label: "Post-File ROI", path: "postfile_roi", section: "postfile" },
  { label: "Maturity Date", path: "postfile_maturityDate", section: "postfile" },
  { label: "Live POS", path: "postfile_currentOutstanding", section: "postfile" },
  { label: "Disbursement Date", path: "disbursement_date", section: "approval" },
  { label: "Delivery Date", path: "delivery_date", section: "delivery" },
  { label: "Invoice Number", path: "invoice_number", section: "delivery" },
  { label: "Insurance Company", path: "insurance_company_name", section: "delivery" },
  { label: "Payout %", path: "payout_percentage", section: "payout" },
  { label: "Payout Amount", path: "payout_amount", section: "payout" },
  { label: "Bill Number", path: "bill_number", section: "payout" },
  { label: "Loan Notes", path: "loan_notes", section: "postfile" },
];

const toSearchValue = (value) => {
  if (value == null || value === "") return "";
  if (dayjs.isDayjs(value)) return value.format("DD MMM YYYY HH:mm");
  if (Array.isArray(value)) {
    if (!value.length) return "";
    const parts = value
      .map((entry) => {
        if (entry == null) return "";
        if (typeof entry === "object") return JSON.stringify(entry);
        return String(entry);
      })
      .filter(Boolean);
    return parts.join(" | ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const prettifyPath = (path) =>
  String(path)
    .split(".")
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/\[(\d+)\]/g, " $1")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .trim(),
    )
    .join(" > ");

const inferSectionFromPath = (path) => {
  const p = String(path || "").toLowerCase();
  if (
    p.includes("approval_") ||
    p.includes("approvaldate") ||
    p.includes("approvalstatus") ||
    p.includes("approvalamount")
  ) {
    return "approval";
  }
  if (
    p.includes("postfile_") ||
    p.includes("instrument") ||
    p.includes("dispatch") ||
    p.includes("disbursement") ||
    p.includes("maturity") ||
    p.includes("outstanding")
  ) {
    return "postfile";
  }
  if (
    p.includes("delivery") ||
    p.includes("rc_") ||
    p.includes("invoice") ||
    p.includes("insurance_")
  ) {
    return "delivery";
  }
  if (
    p.includes("payout") ||
    p.includes("bill_") ||
    p.includes("receivable") ||
    p.includes("payable")
  ) {
    return "payout";
  }
  if (
    p.includes("coapplicant") ||
    p.includes("guarantor") ||
    p.includes("authorisedsignatory") ||
    p.includes("recordsource") ||
    p.includes("source") ||
    p.includes("business") ||
    p.includes("occupation") ||
    p.includes("prefile")
  ) {
    return "prefile";
  }
  return "profile";
};

const flattenSearchFields = (obj) => {
  const out = [];
  const seen = new Set();

  const walk = (value, path = "") => {
    if (value == null) return;

    if (dayjs.isDayjs(value) || typeof value !== "object") {
      const key = String(path || "").trim();
      const val = toSearchValue(value).trim();
      if (!key || !val) return;
      const dedupe = `${key}::${val}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      out.push({
        label: prettifyPath(key),
        path: key,
        section: inferSectionFromPath(key),
        value: val,
      });
      return;
    }

    if (Array.isArray(value)) {
      if (!value.length) return;
      const allPrimitive = value.every((entry) => entry == null || typeof entry !== "object" || dayjs.isDayjs(entry));
      if (allPrimitive) {
        const key = String(path || "").trim();
        const val = toSearchValue(value).trim();
        if (key && val) {
          const dedupe = `${key}::${val}`;
          if (!seen.has(dedupe)) {
            seen.add(dedupe);
            out.push({
              label: prettifyPath(key),
              path: key,
              section: inferSectionFromPath(key),
              value: val,
            });
          }
        }
        return;
      }
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
      return;
    }

    Object.entries(value).forEach(([k, v]) => {
      const childPath = path ? `${path}.${k}` : k;
      walk(v, childPath);
    });
  };

  walk(obj);
  return out;
};

const SECTION_META = {
  profile: { label: "Customer Profile", icon: "UserRound" },
  prefile: { label: "Pre-File", icon: "ClipboardCheck" },
  approval: { label: "Loan Approval", icon: "BadgeCheck" },
  postfile: { label: "Post-File", icon: "FileStack" },
  delivery: { label: "Vehicle Delivery", icon: "Truck" },
  payout: { label: "Payout", icon: "IndianRupee" },
};

const LoanViewModal = ({ open, loan, onClose, initialTab }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [fullLoan, setFullLoan] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(false);

  const loanId = loan?._id || loan?.loanId;
  const displayLoan = fullLoan || loan;

  useEffect(() => {
    if (!open || !loanId) {
      if (!open) {
        setFullLoan(null);
        setSearchQuery("");
      }
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
    return () => {
      cancelled = true;
    };
  }, [open, loanId]);

  useEffect(() => {
    if (!displayLoan) return;
    form.setFieldsValue(convertDatesToDayjsDeep(displayLoan));
    setActiveTab(initialTab || displayLoan.currentStage || "profile");
  }, [displayLoan, form, initialTab]);

  const sections = useMemo(() => {
    if (!displayLoan) return [];
    return [
      {
        key: "profile",
        ...SECTION_META.profile,
        content: (
          <>
            <LeadDetails readOnly />
            <VehicleDetailsForm readOnly />
            <FinanceDetailsForm readOnly />
            <PersonalDetailsWithSearch readOnly />
            <EmploymentDetails readOnly />
            <IncomeDetails readOnly />
            <BankDetails readOnly />
            <ReferenceDetails readOnly />
            <KycDetails readOnly />
          </>
        ),
      },
      {
        key: "prefile",
        ...SECTION_META.prefile,
        content: (
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
        ...SECTION_META.approval,
        content: (
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
        ...SECTION_META.postfile,
        content: <PostFileStep form={form} readOnly />,
      },
      {
        key: "delivery",
        ...SECTION_META.delivery,
        content: <VehicleDeliveryStep form={form} readOnly />,
      },
      {
        key: "payout",
        ...SECTION_META.payout,
        content: <PayoutSection form={form} readOnly />,
      },
    ];
  }, [displayLoan, form]);

  const query = searchQuery.trim().toLowerCase();

  const dynamicSearchFields = useMemo(
    () => (displayLoan ? flattenSearchFields(displayLoan) : []),
    [displayLoan],
  );

  const globalMatches = useMemo(() => {
    if (!displayLoan || !query) return [];

    const curated = GLOBAL_SEARCH_FIELDS.map((f) => {
      const value = fmtValue(getPath(displayLoan, f.path));
      return { ...f, value };
    });

    const byPath = new Map(curated.map((f) => [f.path, f]));
    dynamicSearchFields.forEach((f) => {
      if (!byPath.has(f.path)) byPath.set(f.path, f);
    });

    const matches = Array.from(byPath.values()).map((f) => {
      const corpus = `${f.label} ${f.path} ${f.value}`.toLowerCase();
      if (!corpus.includes(query)) return null;
      return {
        ...f,
        sectionLabel: SECTION_META[f.section]?.label || f.section,
      };
    }).filter(Boolean);

    return matches;
  }, [displayLoan, dynamicSearchFields, query]);

  const groupedMatches = useMemo(() => {
    if (!globalMatches.length) return [];
    const map = new Map();
    globalMatches.forEach((m) => {
      if (!map.has(m.section)) map.set(m.section, []);
      map.get(m.section).push(m);
    });
    return Array.from(map.entries()).map(([section, fields]) => ({
      section,
      sectionLabel: SECTION_META[section]?.label || section,
      fields,
    }));
  }, [globalMatches]);

  const activeSection = useMemo(
    () => sections.find((s) => s.key === activeTab) || sections[0],
    [sections, activeTab],
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="90vw"
      centered
      className="theme-modal-clean"
      styles={{ body: { padding: 0, overflow: "hidden", borderRadius: 24 } }}
      destroyOnClose
    >
      <div className="h-[90vh] overflow-hidden bg-background">
        <div className="border-b border-border bg-gradient-to-r from-sky-100/80 via-white to-emerald-100/70 px-6 py-5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-12 w-12 rounded-2xl border border-border bg-card flex items-center justify-center shrink-0">
                {loadingLoan ? <Spin size="small" /> : <Icon name="FileSearch" size={22} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Loan Case Explorer</p>
                <h2 className="mt-1 text-xl font-black text-foreground truncate">
                  {displayLoan?.loan_number || displayLoan?.loanId || "Loan Details"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-foreground font-semibold">
                    {displayLoan?.customerName || "Unknown Customer"}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-foreground">
                    {displayLoan?.status || "New"}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-foreground">
                    {displayLoan?.currentStage || "profile"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-border bg-card text-foreground hover:bg-muted flex items-center justify-center"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-lg">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Global search across all sections and fields"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {query
                ? `${globalMatches.length} matching field(s) across ${groupedMatches.length} section(s)`
                : "Search shows direct field matches across all sections"}
            </div>
          </div>
        </div>

        <div className="h-[calc(90vh-152px)] overflow-y-auto bg-gradient-to-b from-background via-background to-muted/20">
          <main className="app-max-wrap w-full p-3 md:p-4">
            <div className="sticky top-0 z-20 -mx-1 mb-4 rounded-2xl border border-border/60 bg-background/90 px-2 py-2 backdrop-blur">
              <div className="flex flex-wrap gap-2 overflow-x-auto">
                {sections.map((section) => {
                  const active = activeSection?.key === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveTab(section.key)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-sky-400 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon name={section.icon} size={14} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!displayLoan || loadingLoan ? (
              <div className="h-full flex items-center justify-center text-muted-foreground"><Spin /></div>
            ) : (
              <Form form={form} layout="vertical" disabled>
                {query ? (
                  <div className="mb-4 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm dark:border-sky-900/50 dark:from-sky-950/20 dark:to-slate-950">
                    <div className="flex items-center gap-2">
                      <Icon name="SearchCheck" size={16} />
                      <p className="text-sm font-bold text-foreground">Global Search Results</p>
                    </div>
                    {groupedMatches.length === 0 ? (
                      <div className="mt-3 text-sm text-muted-foreground">No field matched "{searchQuery}".</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {groupedMatches.map((group) => (
                          <div key={group.section} className="rounded-xl border border-border bg-background p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                {group.sectionLabel}
                              </p>
                              <button
                                type="button"
                                className="rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
                                onClick={() => setActiveTab(group.section)}
                              >
                                Open Section
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {group.fields.map((f) => (
                                <div key={`${f.section}-${f.path}`} className="rounded-lg border border-border bg-card p-2.5">
                                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{f.label}</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground break-words">{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                      <Icon name={activeSection?.icon || "FileText"} size={15} />
                    </div>
                    <p className="text-base font-bold text-foreground">{activeSection?.label || "Section"}</p>
                  </div>
                  {activeSection?.content}
                </div>
              </Form>
            )}
          </main>
        </div>
      </div>
    </Modal>
  );
};

export default LoanViewModal;
