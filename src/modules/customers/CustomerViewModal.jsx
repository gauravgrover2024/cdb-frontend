import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tag } from "antd";
import dayjs from "dayjs";
import { loansApi } from "../../api/loans";
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

const asYesNo = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (!hasValue(value)) return "—";
  return asText(value);
};

const normalizeIdentityValue = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizePhoneValue = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const normalizePanValue = (value) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();

const getLoanId = (loan) =>
  String(loan?._id || loan?.loanId || loan?.loan_number || loan?.id || "").trim();

const toLoanRows = (response) => {
  const direct = Array.isArray(response) ? response : [];
  if (direct.length) return direct;

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.loans)) return response.loans;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const hasCustomerIdentityMatch = (loan, customer) => {
  const customerName = normalizeIdentityValue(customer?.customerName);
  const customerMobile = normalizePhoneValue(customer?.primaryMobile);
  const customerPan = normalizePanValue(customer?.panNumber);

  const loanName = normalizeIdentityValue(loan?.customerName || loan?.applicantName);
  const loanMobile = normalizePhoneValue(loan?.primaryMobile || loan?.mobile || loan?.phone);
  const loanPan = normalizePanValue(loan?.panNumber || loan?.pan);
  const customerDbId = String(customer?._id || customer?.id || "").trim();
  const linkedCustomerId = String(loan?.customerId || "").trim();

  if (customerDbId && linkedCustomerId && customerDbId === linkedCustomerId) {
    return true;
  }

  const nameMobileMatch = Boolean(
    customerName && loanName && customerName === loanName && customerMobile && loanMobile && customerMobile === loanMobile,
  );
  const namePanMatch = Boolean(
    customerName && loanName && customerName === loanName && customerPan && loanPan && customerPan === loanPan,
  );
  const panMobileMatch = Boolean(
    customerPan && loanPan && customerPan === loanPan && customerMobile && loanMobile && customerMobile === loanMobile,
  );

  return nameMobileMatch || namePanMatch || panMobileMatch;
};

const matchesLoanSearch = (loan, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;

  const fields = [
    loan?.loanId,
    loan?.loan_number,
    loan?.customerName,
    loan?.primaryMobile,
    loan?.typeOfLoan,
    loan?.loanType,
    loan?.currentStage,
    loan?.status,
    loan?.approval_status,
    loan?.approval_bankName,
    loan?.bankName,
    loan?.vehicleMake,
    loan?.vehicleModel,
    loan?.vehicleVariant,
  ];

  return fields.some((field) => String(field || "").toLowerCase().includes(q));
};

const formatLoanVehicle = (loan) =>
  [loan?.vehicleMake, loan?.vehicleModel, loan?.vehicleVariant]
    .filter((item) => hasValue(item))
    .join(" ") || "—";

const formatCompanyPartners = (partners) => {
  if (!Array.isArray(partners) || !partners.length) return "—";
  const names = partners
    .map((partner) => {
      if (!partner || typeof partner !== "object") return String(partner || "").trim();
      return String(partner.name || partner.partnerName || partner.fullName || "").trim();
    })
    .filter(Boolean);
  return names.length ? names.join(", ") : "—";
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
    <div className="w-[170px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
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
  const [linkedLoans, setLinkedLoans] = useState([]);
  const [linkedLoanSearch, setLinkedLoanSearch] = useState("");
  const [linkedLoansLoading, setLinkedLoansLoading] = useState(false);
  const [linkedLoansError, setLinkedLoansError] = useState("");

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

  useEffect(() => {
    if (!open || !c) return;

    let cancelled = false;

    const loadLinkedLoans = async () => {
      setActiveTab("profile");
      setLinkedLoanSearch("");
      setLinkedLoans(Array.isArray(c.linkedLoans) ? c.linkedLoans : []);
      setLinkedLoansError("");

      const customerName = String(c.customerName || "").trim();
      const customerMobile = normalizePhoneValue(c.primaryMobile);
      const customerDbId = String(c._id || c.id || "").trim();

      if (!customerName && !customerMobile && !customerDbId) return;

      setLinkedLoansLoading(true);
      try {
        const PAGE_SIZE = 250;
        const MAX_PAGES = 12;

        const queryList = [];
        if (customerDbId) {
          queryList.push({
            customerId: customerDbId,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }
        if (customerName.length >= 2) {
          queryList.push({
            search: customerName,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }
        if (customerMobile.length >= 10) {
          queryList.push({
            search: customerMobile,
            limit: PAGE_SIZE,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
        }

        const merged = new Map();
        const ingest = (rows) => {
          rows.forEach((loan) => {
            const id = getLoanId(loan);
            if (!id) return;
            if (!merged.has(id)) merged.set(id, loan);
          });
        };

        ingest(Array.isArray(c.linkedLoans) ? c.linkedLoans : []);

        for (const query of queryList) {
          let skip = 0;
          let pages = 0;
          while (pages < MAX_PAGES) {
            const response = await loansApi.getAll({ ...query, skip });
            const rows = toLoanRows(response);
            if (!rows.length) break;

            ingest(rows);

            const total = Number(
              response?.count ?? response?.total ?? response?.pagination?.total,
            );
            const hasMore = Boolean(response?.hasMore ?? response?.pagination?.hasMore);

            skip += rows.length;
            pages += 1;

            if (!hasMore && (!Number.isFinite(total) || skip >= total) && rows.length < PAGE_SIZE) {
              break;
            }
          }
        }

        if (cancelled) return;

        const strictMatches = [...merged.values()]
          .filter((loan) => hasCustomerIdentityMatch(loan, c))
          .sort((a, b) => {
            const aTs = Math.max(Date.parse(a?.updatedAt || "") || 0, Date.parse(a?.createdAt || "") || 0);
            const bTs = Math.max(Date.parse(b?.updatedAt || "") || 0, Date.parse(b?.createdAt || "") || 0);
            return bTs - aTs;
          });

        setLinkedLoans(strictMatches);
      } catch (error) {
        if (!cancelled) {
          setLinkedLoansError(error?.message || "Failed to load linked loans");
        }
      } finally {
        if (!cancelled) {
          setLinkedLoansLoading(false);
        }
      }
    };

    loadLinkedLoans();

    return () => {
      cancelled = true;
    };
  }, [open, c]);

  const filteredLinkedLoans = useMemo(
    () => linkedLoans.filter((loan) => matchesLoanSearch(loan, linkedLoanSearch)),
    [linkedLoans, linkedLoanSearch],
  );

  if (!c) return null;

  const tabs = [
    { key: "profile", label: "Profile", icon: "User" },
    { key: "employment", label: "Employment", icon: "Briefcase" },
    { key: "banking", label: "Banking & KYC", icon: "Shield" },
    { key: "references", label: "References", icon: "Users" },
    { key: "loans", label: "Linked Loans", icon: "FileStack" },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1240}
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
                  <LabeledValue label="Applicant Type" value={asText(c.applicantType)} />
                  <LabeledValue label="Primary Mobile" value={asText(c.primaryMobile)} mono />
                  <LabeledValue label="Secondary Mobile" value={asText(c.secondaryMobile)} mono />
                  <LabeledValue label="Whatsapp" value={asText(c.whatsappNumber)} mono />
                  <LabeledValue label="Extra Mobiles" value={asText(c.extraMobiles)} mono />
                  <LabeledValue label="Email" value={asText(c.email || c.emailAddress)} />
                  <LabeledValue label="Date of Birth" value={asDate(c.dob)} />
                  <LabeledValue label="Gender" value={asText(c.gender)} />
                  <LabeledValue label="Contact Person" value={asText(c.contactPersonName)} />
                  <LabeledValue label="Contact Person Mobile" value={asText(c.contactPersonMobile)} mono />
                </div>
                <div>
                  <LabeledValue label="Father / Spouse" value={asText(c.sdwOf || c.fatherName)} />
                  <LabeledValue label="Mother" value={asText(c.motherName)} />
                  <LabeledValue label="Marital Status" value={asText(c.maritalStatus)} />
                  <LabeledValue label="Education" value={asText(c.education)} />
                  <LabeledValue label="Education (Other)" value={asText(c.educationOther)} />
                  <LabeledValue label="Dependents" value={asText(c.dependents)} />
                  <LabeledValue label="Has Co-Applicant" value={asYesNo(c.hasCoApplicant)} />
                  <LabeledValue label="Has Guarantor" value={asYesNo(c.hasGuarantor)} />
                  <LabeledValue label="Same As Current Address" value={asYesNo(c.sameAsCurrentAddress)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="profile" title="Address Details" icon="MapPin">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Current Address" value={asText(c.residenceAddress || c.currentAddress)} />
                  <LabeledValue label="City" value={asText(c.city)} />
                  <LabeledValue label="State" value={asText(c.state)} />
                  <LabeledValue label="Pincode" value={asText(c.pincode)} mono />
                  <LabeledValue label="House Type" value={asText(c.houseType)} />
                  <LabeledValue label="Years In Current House" value={asText(c.yearsInCurrentHouse)} />
                  <LabeledValue label="Years In Current City" value={asText(c.yearsInCurrentCity)} />
                  <LabeledValue label="Address Type" value={asText(c.addressType)} />
                </div>
                <div>
                  <LabeledValue label="Permanent Address" value={asText(c.permanentAddress)} />
                  <LabeledValue label="Permanent City" value={asText(c.permanentCity)} />
                  <LabeledValue label="Permanent PIN" value={asText(c.permanentPincode)} mono />
                  <LabeledValue label="Registration Address" value={asText(c.registrationAddress)} />
                  <LabeledValue label="Registration City" value={asText(c.registrationCity)} />
                  <LabeledValue label="Registration PIN" value={asText(c.registrationPincode)} mono />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "employment" && (
          <div className="space-y-4">
            <SectionCard tone="employment" title="Employment Details" icon="Briefcase">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Occupation Type" value={asText(c.occupationType)} />
                  <LabeledValue label="Employment Type" value={asText(c.employmentType)} />
                  <LabeledValue label="Professional Type" value={asText(c.professionalType)} />
                  <LabeledValue label="Company / Business" value={asText(c.companyName)} />
                  <LabeledValue label="Designation" value={asText(c.designation)} />
                  <LabeledValue label="Company Type" value={asText(c.companyType)} />
                  <LabeledValue label="Business Nature" value={asText(c.businessNature)} />
                  <LabeledValue label="Company Partners" value={formatCompanyPartners(c.companyPartners)} />
                  <LabeledValue label="Incorporation Year" value={asText(c.incorporationYear)} />
                  <LabeledValue label="MSME" value={asYesNo(c.isMSME)} />
                </div>
                <div>
                  <LabeledValue label="Current Experience" value={asText(c.experienceCurrent || c.currentExp)} />
                  <LabeledValue label="Total Experience" value={asText(c.totalExperience || c.totalExp)} />
                  <LabeledValue label="Employment Address" value={asText(c.employmentAddress || c.companyAddress)} />
                  <LabeledValue label="Employment City" value={asText(c.employmentCity || c.companyCity)} />
                  <LabeledValue label="Employment PIN" value={asText(c.employmentPincode || c.companyPincode)} mono />
                  <LabeledValue label="Employment Phone" value={asText(c.employmentPhone || c.companyPhone)} mono />
                  <LabeledValue label="Official Email" value={asText(c.officialEmail)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="employment" title="Income Details" icon="Wallet">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="Monthly Income" value={asMoney(c.monthlyIncome)} />
                  <LabeledValue label="Salary Monthly" value={asMoney(c.salaryMonthly)} />
                  <LabeledValue label="Monthly Salary" value={asMoney(c.monthlySalary)} />
                  <LabeledValue label="Annual Income" value={asMoney(c.annualIncome)} />
                </div>
                <div>
                  <LabeledValue label="Total ITR Income" value={asMoney(c.totalIncomeITR || c.itrYears)} />
                  <LabeledValue label="Annual Turnover" value={asMoney(c.annualTurnover)} />
                  <LabeledValue label="Net Profit" value={asMoney(c.netProfit)} />
                  <LabeledValue label="Other Income" value={asMoney(c.otherIncome)} />
                  <LabeledValue label="Other Income Source" value={asText(c.otherIncomeSource)} />
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
                  <LabeledValue label="Branch" value={asText(c.branch)} />
                </div>
                <div>
                  <LabeledValue label="Account Type" value={asText(c.accountType)} />
                  <LabeledValue label="Account Since (Years)" value={asText(c.accountSinceYears)} />
                  <LabeledValue label="Opened In" value={asText(c.openedIn)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard tone="banking" title="KYC, Proofs & Nominee" icon="ShieldCheck">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                <div>
                  <LabeledValue label="PAN" value={asText(c.panNumber)} mono />
                  <LabeledValue label="Aadhaar" value={asText(c.aadhaarNumber)} mono />
                  <LabeledValue label="Passport" value={asText(c.passportNumber)} mono />
                  <LabeledValue label="DL Number" value={asText(c.dlNumber)} mono />
                  <LabeledValue label="GST Number" value={asText(c.gstNumber)} mono />
                  <LabeledValue label="Voter ID" value={asText(c.voterId)} mono />
                </div>
                <div>
                  <LabeledValue label="Identity Proof Type" value={asText(c.identityProofType)} />
                  <LabeledValue label="Identity Proof Number" value={asText(c.identityProofNumber)} />
                  <LabeledValue label="Identity Proof Expiry" value={asDate(c.identityProofExpiry)} />
                  <LabeledValue label="Address Proof Type" value={asText(c.addressProofType)} />
                  <LabeledValue label="Address Proof Number" value={asText(c.addressProofNumber)} />
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
            <SectionCard tone="loans" title="Linked Loans" icon="FileStack">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {linkedLoansLoading
                    ? "Loading linked loans..."
                    : `${filteredLinkedLoans.length} loan${filteredLinkedLoans.length === 1 ? "" : "s"} shown`}
                </div>
                <div className="relative w-full md:max-w-xs">
                  <Icon
                    name="Search"
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={linkedLoanSearch}
                    onChange={(e) => setLinkedLoanSearch(e.target.value)}
                    placeholder="Search linked loans..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              {linkedLoansError && (
                <div className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {linkedLoansError}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/70">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Loan ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Mobile</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Stage</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Bank</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Vehicle</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {filteredLinkedLoans.map((loan) => (
                      <tr key={getLoanId(loan) || `${loan.loanId}-${loan.createdAt}`}>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                          {asText(loan.loan_number || loan.loanId)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.customerName)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.primaryMobile)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.typeOfLoan || loan.loanType)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.currentStage)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.status || loan.approval_status)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asText(loan.approval_bankName || loan.bankName)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {asMoney(loan.approval_loanAmountDisbursed || loan.approval_loanAmountApproved || loan.loanAmount || loan.financeExpectation)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatLoanVehicle(loan)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{asDate(loan.createdAt)}</td>
                      </tr>
                    ))}
                    {!linkedLoansLoading && filteredLinkedLoans.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No linked loans found for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CustomerViewModal;
