import React, { useMemo, useState } from "react";
import { Modal, Tag } from "antd";
import dayjs from "dayjs";
import Icon from "../../components/AppIcon";

const hasValue = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && v.trim() === "");

const asText = (v) => {
  if (!hasValue(v)) return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => String(x ?? "").trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  return String(v);
};

const asDate = (v) => {
  if (!hasValue(v)) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY") : String(v);
};

const asMoney = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const getKycClasses = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "bg-emerald-500/12 text-emerald-700 border-emerald-400/30 dark:bg-emerald-400/12 dark:text-emerald-300";
  if (s === "in progress") return "bg-sky-500/12 text-sky-700 border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-300";
  if (s === "pending docs") return "bg-amber-500/12 text-amber-700 border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-300";
  if (s === "rejected") return "bg-rose-500/12 text-rose-700 border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-300";
  return "bg-slate-500/12 text-slate-700 border-slate-400/30 dark:bg-slate-400/12 dark:text-slate-300";
};

const sectionTone = {
  profile: {
    border: "border-sky-200/70 dark:border-sky-900/60",
    bg: "bg-sky-50/50 dark:bg-sky-950/20",
    icon: "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
  },
  employment: {
    border: "border-emerald-200/70 dark:border-emerald-900/60",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    icon: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
  },
  banking: {
    border: "border-indigo-200/70 dark:border-indigo-900/60",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
    icon: "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-950",
  },
  references: {
    border: "border-amber-200/70 dark:border-amber-900/60",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    icon: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
  },
  loans: {
    border: "border-violet-200/70 dark:border-violet-900/60",
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
    icon: "bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950",
  },
};

const LabeledValue = ({ label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-1.5">
    <div className="w-[150px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div className={`min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>
      {value}
    </div>
  </div>
);

const SectionCard = ({ tone = "profile", title, icon, children }) => {
  const t = sectionTone[tone] || sectionTone.profile;
  return (
    <section className={`rounded-2xl border ${t.border} ${t.bg} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.icon}`}>
          <Icon name={icon} size={15} />
        </div>
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      {children}
    </section>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "border-sky-400 bg-sky-500/12 text-sky-700 dark:border-sky-500 dark:bg-sky-500/20 dark:text-sky-200"
        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    }`}
  >
    <Icon name={icon} size={12} />
    {label}
  </button>
);

const CustomerViewModal = ({ open, customer, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState("profile");

  const c = useMemo(() => {
    if (!customer) return null;
    return {
      ...customer,
      aadhaarNumber: customer.aadhaarNumber || customer.aadharNumber || "",
      secondaryMobile:
        customer.secondaryMobile ||
        (Array.isArray(customer.extraMobiles) ? customer.extraMobiles[0] : ""),
      reference1:
        customer.reference1 ||
        (customer.reference1_name
          ? {
              name: customer.reference1_name,
              mobile: customer.reference1_mobile,
              address: customer.reference1_address,
              pincode: customer.reference1_pincode,
              city: customer.reference1_city,
              relation: customer.reference1_relation,
            }
          : null),
      reference2:
        customer.reference2 ||
        (customer.reference2_name
          ? {
              name: customer.reference2_name,
              mobile: customer.reference2_mobile,
              address: customer.reference2_address,
              pincode: customer.reference2_pincode,
              city: customer.reference2_city,
              relation: customer.reference2_relation,
            }
          : null),
      linkedLoans: Array.isArray(customer?.linkedLoans) ? customer.linkedLoans : [],
    };
  }, [customer]);

  if (!c) return null;

  const tabs = [
    { key: "profile", label: "Profile", icon: "User" },
    { key: "employment", label: "Employment", icon: "Briefcase" },
    { key: "banking", label: "Banking & KYC", icon: "Shield" },
    { key: "references", label: "References", icon: "Users" },
    ...(c.linkedLoans.length > 0 ? [{ key: "loans", label: "Linked Loans", icon: "FileStack" }] : []),
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1180}
      centered
      destroyOnHidden
      className="theme-modal"
      styles={{ body: { padding: 0 } }}
    >
      <div className="border-b border-slate-200/70 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
              Customer View
            </div>
            <h2 className="truncate text-2xl font-black text-slate-900 dark:text-slate-100">
              {c.customerName || "Untitled Customer"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tag className="m-0 rounded-full border-none bg-slate-500/12 px-2 py-0 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-400/12 dark:text-slate-200">
                {c.customerType || "New"}
              </Tag>
              <Tag className={`m-0 rounded-full border px-2 py-0 text-[10px] font-bold uppercase ${getKycClasses(c.kycStatus)}`}>
                {c.kycStatus || "Unknown"}
              </Tag>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ID: <span className="font-semibold text-slate-700 dark:text-slate-200">{asText(c.customerId)}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Created: <span className="font-semibold text-slate-700 dark:text-slate-200">{asDate(c.createdAt || c.createdOn)}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {typeof onEdit === "function" && (
              <button
                type="button"
                onClick={() => onEdit?.()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-100 px-2.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
              >
                <Icon name="Pencil" size={12} />
                Open Customer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
              aria-label="Close"
            >
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[72vh] overflow-y-auto px-6 py-5 bg-background">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="space-y-4">
            <SectionCard tone="profile" title="Personal Details" icon="User">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Mobile" value={asText(c.primaryMobile)} mono />
                  <LabeledValue label="Secondary Mobile" value={asText(c.secondaryMobile)} mono />
                  <LabeledValue label="Email" value={asText(c.email || c.emailAddress)} />
                  <LabeledValue label="Date of Birth" value={asDate(c.dob)} />
                  <LabeledValue label="Gender" value={asText(c.gender)} />
                </div>
                <div>
                  <LabeledValue label="Father / Spouse" value={asText(c.sdwOf || c.fatherName)} />
                  <LabeledValue label="Mother" value={asText(c.motherName)} />
                  <LabeledValue label="Marital Status" value={asText(c.maritalStatus)} />
                  <LabeledValue label="Education" value={asText(c.education)} />
                  <LabeledValue label="Dependents" value={asText(c.dependents)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="profile" title="Address Details" icon="MapPin">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Current Address" value={asText(c.residenceAddress)} />
                  <LabeledValue label="City" value={asText(c.city)} />
                  <LabeledValue label="Pincode" value={asText(c.pincode)} mono />
                </div>
                <div>
                  <LabeledValue label="Permanent Address" value={asText(c.permanentAddress)} />
                  <LabeledValue label="Permanent City" value={asText(c.permanentCity)} />
                  <LabeledValue label="Permanent PIN" value={asText(c.permanentPincode)} mono />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "employment" && (
          <div className="space-y-4">
            <SectionCard tone="employment" title="Employment & Income" icon="Briefcase">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Occupation" value={asText(c.occupationType)} />
                  <LabeledValue label="Company / Business" value={asText(c.companyName)} />
                  <LabeledValue label="Designation" value={asText(c.designation)} />
                  <LabeledValue label="Office Address" value={asText(c.employmentAddress || c.companyAddress)} />
                  <LabeledValue label="Office City" value={asText(c.employmentCity || c.companyCity)} />
                </div>
                <div>
                  <LabeledValue label="Monthly Salary" value={asMoney(c.salaryMonthly || c.monthlyIncome)} />
                  <LabeledValue label="Annual Income" value={asMoney(c.annualIncome || c.itrYears)} />
                  <LabeledValue label="Total ITR Income" value={asMoney(c.totalIncomeITR)} />
                  <LabeledValue label="Business Nature" value={asText(c.businessNature)} />
                  <LabeledValue label="Incorporation Year" value={asText(c.incorporationYear)} />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "banking" && (
          <div className="space-y-4">
            <SectionCard tone="banking" title="Banking Details" icon="Building2">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Bank Name" value={asText(c.bankName)} />
                  <LabeledValue label="Account Number" value={asText(c.accountNumber)} mono />
                  <LabeledValue label="IFSC" value={asText(c.ifsc || c.ifscCode)} mono />
                </div>
                <div>
                  <LabeledValue label="Account Type" value={asText(c.accountType)} />
                  <LabeledValue label="Branch" value={asText(c.branch)} />
                  <LabeledValue label="Account Since (Years)" value={asText(c.accountSinceYears)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="banking" title="KYC & Nominee" icon="ShieldCheck">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="PAN" value={asText(c.panNumber)} mono />
                  <LabeledValue label="Aadhaar" value={asText(c.aadhaarNumber)} mono />
                  <LabeledValue label="Passport" value={asText(c.passportNumber)} mono />
                  <LabeledValue label="DL Number" value={asText(c.dlNumber)} mono />
                </div>
                <div>
                  <LabeledValue label="GST Number" value={asText(c.gstNumber)} mono />
                  <LabeledValue label="Nominee Name" value={asText(c.nomineeName)} />
                  <LabeledValue label="Nominee Relation" value={asText(c.nomineeRelation)} />
                  <LabeledValue label="Nominee DOB" value={asDate(c.nomineeDob)} />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "references" && (
          <div className="space-y-4">
            <SectionCard tone="references" title="Reference 1" icon="UserCheck">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Name" value={asText(c.reference1?.name || c.reference1_name)} />
                  <LabeledValue label="Mobile" value={asText(c.reference1?.mobile || c.reference1_mobile)} mono />
                  <LabeledValue label="Relation" value={asText(c.reference1?.relation || c.reference1_relation)} />
                </div>
                <div>
                  <LabeledValue label="Address" value={asText(c.reference1?.address || c.reference1_address)} />
                  <LabeledValue label="City" value={asText(c.reference1?.city || c.reference1_city)} />
                  <LabeledValue label="Pincode" value={asText(c.reference1?.pincode || c.reference1_pincode)} mono />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="references" title="Reference 2" icon="Users">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Name" value={asText(c.reference2?.name || c.reference2_name)} />
                  <LabeledValue label="Mobile" value={asText(c.reference2?.mobile || c.reference2_mobile)} mono />
                  <LabeledValue label="Relation" value={asText(c.reference2?.relation || c.reference2_relation)} />
                </div>
                <div>
                  <LabeledValue label="Address" value={asText(c.reference2?.address || c.reference2_address)} />
                  <LabeledValue label="City" value={asText(c.reference2?.city || c.reference2_city)} />
                  <LabeledValue label="Pincode" value={asText(c.reference2?.pincode || c.reference2_pincode)} mono />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "loans" && (
          <div className="space-y-3">
            {c.linkedLoans.map((loan) => (
              <SectionCard key={loan._id || loan.loanId} tone="loans" title={`Loan ${asText(loan.loanId)}`} icon="FileStack">
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <div>
                    <LabeledValue label="Status" value={asText(loan.status)} />
                    <LabeledValue label="Stage" value={asText(loan.currentStage || loan.loanType)} />
                    <LabeledValue label="Type" value={asText(loan.loanType)} />
                  </div>
                  <div>
                    <LabeledValue label="Loan Amount" value={asMoney(loan.loanAmount || loan.approval_loanAmountApproved)} />
                    <LabeledValue label="Tenure" value={hasValue(loan.tenure) ? `${loan.tenure} months` : "—"} />
                    <LabeledValue label="Created" value={asDate(loan.createdAt)} />
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CustomerViewModal;
