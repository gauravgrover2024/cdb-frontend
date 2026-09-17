import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Empty, Table, Tag, Tooltip } from "antd";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileText,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { customersApi } from "../../api/customers";
import { loansApi } from "../../api/loans";
import { insuranceApi } from "../../api/insurance";
import { paymentsApi } from "../../api/payments";

// ─── Formatting helpers ─────────────────────────────────────────────────────

const getData = (response) => response?.data?.data ?? response?.data ?? response ?? null;
const toArray = (value) => (Array.isArray(value) ? value : []);
const isPresent = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const firstValue = (...values) => values.find((value) => isPresent(value));
const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
// Many schema fields default to 0, so "first present" would pick a meaningless 0.
const firstPositive = (...values) => values.map(asNumber).find((n) => n > 0) || 0;
const normalizeText = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const lastTenDigits = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(asNumber(value));
const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(asNumber(value));

// Accepts Date, ISO strings, "YYYY-MM-DD", "DD-MM-YYYY" and "DD/MM/YYYY".
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  const date = dmy ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};
const addMonths = (value, months) => {
  const date = parseDate(value);
  if (!date || !months) return null;
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months));
  return next;
};
const daysUntil = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
};
const ageFrom = (value) => {
  const dob = parseDate(value);
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
};
const maskTail = (value, visible = 4) => {
  const text = String(value || "").replace(/\s+/g, "");
  if (!text) return "";
  return text.length <= visible ? text : `${"•".repeat(Math.min(text.length - visible, 8))}${text.slice(-visible)}`;
};
const getInitials = (name) => {
  const text = String(name || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : text.slice(0, 2)).toUpperCase();
};
const nameToHue = (name) => {
  const str = String(name || "?");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};
const yearsLabel = (n) => `${n} ${Number(n) === 1 ? "Year" : "Years"}`;

// ─── Domain mapping (matches Loan, InsuranceCase and Payment models) ────────

const KYC_TAG = {
  completed: { color: "green", label: "KYC Completed" },
  "in progress": { color: "blue", label: "KYC In Progress" },
  "pending docs": { color: "gold", label: "KYC Pending Docs" },
  rejected: { color: "red", label: "KYC Rejected" },
};

const loanState = (loan, disbursedAmount) => {
  const disburse = normalizeText(loan?.disburse_status);
  const approval = normalizeText(loan?.approval_status);
  const status = normalizeText(loan?.status);
  if (normalizeText(loan?.isFinanced) === "no") return { key: "cash", label: "Cash purchase", color: "default" };
  if (/cancel/.test(`${disburse} ${status}`)) return { key: "closed", label: "Cancelled", color: "default" };
  if (/reject/.test(`${approval} ${status}`)) return { key: "closed", label: "Rejected", color: "red" };
  if (disburse.includes("disburs") || status.includes("disburs") || disbursedAmount > 0) {
    return { key: "disbursed", label: "Disbursed", color: "green" };
  }
  if (approval.includes("approv")) return { key: "process", label: "Approved", color: "blue" };
  return { key: "process", label: "In process", color: "gold" };
};

const normalizeLoan = (loan = {}) => {
  const disbursedAmount = firstPositive(loan.disburse_amount, loan.approval_loanAmountDisbursed, loan.postfile_loanAmountDisbursed);
  const approvedAmount = firstPositive(loan.approval_loanAmountApproved);
  const requestedAmount = firstPositive(loan.loanAmount, loan.financeExpectation);
  const tenureMonths = firstPositive(loan.postfile_tenureMonths, loan.approval_tenureMonths, loan.tenure);
  const firstEmiDate = parseDate(loan.postfile_firstEmiDate);
  return {
    key: String(loan._id || loan.loanId),
    routeId: loan._id || loan.loanId,
    loanId: loan.loanId || "—",
    loanType: firstValue(loan.typeOfLoan, loan.loanType) || "",
    vehicle: [loan.vehicleMake, loan.vehicleModel, loan.vehicleVariant].filter(Boolean).join(" ") || "Vehicle not added",
    registrationNumber: firstValue(loan.vehicleRegNo, loan.rc_redg_no, loan.registrationNumber) || "",
    bank: firstValue(loan.disburse_bankName, loan.approval_bankName, loan.bankName) || "",
    requestedAmount,
    approvedAmount,
    disbursedAmount,
    roi: firstPositive(loan.postfile_roi, loan.approval_roi, loan.interestRate),
    tenureMonths,
    emi: firstPositive(loan.postfile_emiAmount),
    firstEmiDate,
    lastEmiDate: firstEmiDate && tenureMonths ? addMonths(firstEmiDate, tenureMonths - 1) : null,
    approvedOn: parseDate(loan.approval_approvalDate),
    disbursedOn: parseDate(firstValue(loan.disburse_date, loan.approval_disbursedDate, loan.disbursement_date)),
    stage: loan.currentStage || "",
    state: loanState(loan, disbursedAmount),
    createdAt: parseDate(loan.createdAt),
  };
};

const INSURANCE_STATUS = {
  issued: { label: "Issued", color: "green" },
  submitted: { label: "Submitted", color: "blue" },
  draft: { label: "Draft", color: "default" },
  cancelled: { label: "Cancelled", color: "red" },
};

const normalizeInsurance = (row = {}) => {
  const quotes = toArray(row.quotes);
  const accepted =
    quotes.find((quote) => isPresent(row.acceptedQuoteId) && String(quote?.id) === String(row.acceptedQuoteId)) ||
    quotes.find((quote) => quote?.isAccepted);
  const tenure = row.policyTenure || {};
  const odYears = asNumber(tenure.odTenureYears);
  const tpYears = asNumber(tenure.tpTenureYears);
  return {
    key: String(row._id || row.caseId),
    routeId: row.caseId || row._id,
    caseId: row.caseId || "—",
    policyNumber: row.newPolicyNumber || "",
    insurer: firstValue(row.newInsuranceCompany, accepted?.insuranceCompany) || "",
    policyType: firstValue(row.newPolicyType, accepted?.coverageType) || "",
    tenureLabel: odYears && tpYears ? `${yearsLabel(odYears)} OD + ${yearsLabel(tpYears)} TP` : row.newInsuranceDuration || "",
    premium: firstPositive(row.newTotalPremium, accepted?.totalPremium),
    idv: firstPositive(row.newIdvAmount, accepted?.totalIdv, row.newVehicleIdv),
    vehicle: [row.vehicleMake, row.vehicleModel, row.vehicleVariant].filter(Boolean).join(" ") || "",
    registrationNumber: row.registrationNumber || "",
    issuedOn: parseDate(row.newIssueDate),
    odExpiry: parseDate(row.newOdExpiryDate),
    tpExpiry: parseDate(row.newTpExpiryDate),
    status: INSURANCE_STATUS[normalizeText(row.status)] || { label: row.status || "Draft", color: "default" },
    isIssued: normalizeText(row.status) === "issued",
    createdAt: parseDate(row.createdAt),
    customerId: String(row.customerId || ""),
    customerName: firstValue(row.customerName, row.customerSnapshot?.customerName) || "",
    mobile: firstValue(row.mobile, row.customerSnapshot?.primaryMobile) || "",
  };
};

const expiryBadge = (date) => {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { label: "Expired", className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30" };
  if (days <= 30) return { label: `${days}d left`, className: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" };
  return null;
};

// Payment sheets hold showroom payments and AutoCredits receipts per loan file — not EMIs.
const paymentEntriesFromSheet = (sheet = {}) => {
  const entries = [];
  toArray(sheet.showroomRows).forEach((row, index) => {
    const amount = asNumber(row?.paymentAmount);
    if (amount <= 0) return;
    entries.push({
      key: `${sheet.loanId}-s-${index}`,
      loanId: sheet.loanId,
      direction: "paid",
      label: row?.paymentType || "Showroom payment",
      party: row?.paymentMadeBy || sheet.showroomName || "",
      mode: row?.paymentMode || "",
      amount,
      date: parseDate(row?.paymentDate),
    });
  });
  toArray(sheet.autocreditsRows).forEach((row, index) => {
    const amount = asNumber(row?.receiptAmount);
    if (amount <= 0) return;
    entries.push({
      key: `${sheet.loanId}-r-${index}`,
      loanId: sheet.loanId,
      direction: "received",
      label: toArray(row?.receiptTypes).join(", ") || "Receipt",
      party: "AutoCredits",
      mode: row?.receiptMode || "",
      amount,
      date: parseDate(row?.receiptDate),
    });
  });
  return entries;
};

// ─── UI building blocks ─────────────────────────────────────────────────────

const CARD = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
const LABEL = "text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

const Section = ({ title, subtitle, action, children, bodyClassName = "p-5" }) => (
  <section className={CARD}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>
);

const Kpi = ({ label, value, hint, icon: Icon, tone }) => (
  <div className={`${CARD} p-4`}>
    <div className="flex items-center justify-between gap-2">
      <p className={LABEL}>{label}</p>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={15} /></span>
    </div>
    <p className="mt-3 truncate text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50 2xl:text-2xl">{value}</p>
    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{hint}</p>
  </div>
);

const DetailGroup = ({ icon: Icon, title, rows }) => {
  const visible = rows.filter((row) => isPresent(row.value));
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-slate-400" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      </div>
      {visible.length ? (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {visible.map((row) => (
            <div key={row.label} className={row.wide ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{row.label}</dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">Not added yet</p>
      )}
    </div>
  );
};

const SectionError = ({ text }) => <Alert type="warning" showIcon className="mb-4" message={text} />;

// ─── Page ───────────────────────────────────────────────────────────────────

const CustomerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [paymentSheets, setPaymentSheets] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setSectionErrors({});
      try {
        const [detailResult, dashboardResult] = await Promise.allSettled([
          customersApi.getById(id),
          customersApi.getDashboard(id),
        ]);
        const detail = detailResult.status === "fulfilled" ? getData(detailResult.value) || {} : {};
        const dashboard = dashboardResult.status === "fulfilled" ? getData(dashboardResult.value) || {} : {};
        const resolvedCustomer = { ...(dashboard.customer || {}), ...detail };
        if (!resolvedCustomer._id && !resolvedCustomer.customerId) {
          const reason = detailResult.reason || dashboardResult.reason;
          throw new Error(reason?.message || "Customer not found");
        }

        const customerObjectId = String(resolvedCustomer._id || id);
        const customerName = normalizeText(resolvedCustomer.customerName);
        const customerMobile = lastTenDigits(resolvedCustomer.primaryMobile);
        const errors = {};

        // Loans: linked by customerId, plus legacy files without a link that match both mobile and name.
        const [linkedLoansResult, legacyLoansResult] = await Promise.allSettled([
          loansApi.getAll({ customerId: customerObjectId, limit: 1000, noCount: 1 }),
          customerMobile ? loansApi.getAll({ primaryMobile: customerMobile, limit: 200, noCount: 1 }) : Promise.resolve(null),
        ]);
        if (linkedLoansResult.status === "rejected") errors.loans = "Loan files could not be loaded.";
        const loanMap = new Map();
        toArray(linkedLoansResult.status === "fulfilled" ? getData(linkedLoansResult.value) : []).forEach((loan) => {
          loanMap.set(String(loan._id || loan.loanId), loan);
        });
        toArray(legacyLoansResult.status === "fulfilled" ? getData(legacyLoansResult.value) : []).forEach((loan) => {
          const linkedElsewhere = loan.customerId && String(loan.customerId) !== customerObjectId;
          if (linkedElsewhere || normalizeText(loan.customerName) !== customerName) return;
          loanMap.set(String(loan._id || loan.loanId), loan);
        });
        const normalizedLoans = [...loanMap.values()]
          .map(normalizeLoan)
          .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

        // Insurance list has no customerId filter, so search by mobile and name, then match strictly.
        const insuranceSearches = [customerMobile, resolvedCustomer.customerName].filter((term) => String(term || "").trim().length >= 2);
        const insuranceResults = await Promise.allSettled(
          insuranceSearches.map((search) => insuranceApi.getAll({ search, limit: 200 })),
        );
        if (insuranceResults.some((result) => result.status === "rejected")) errors.insurance = "Some insurance cases could not be loaded.";
        const insuranceMap = new Map();
        insuranceResults.forEach((result) => {
          if (result.status !== "fulfilled") return;
          toArray(getData(result.value)).map(normalizeInsurance).forEach((row) => {
            const idMatch = row.customerId && row.customerId === customerObjectId;
            const linkedElsewhere = row.customerId && row.customerId !== customerObjectId;
            const mobileMatch = customerMobile && lastTenDigits(row.mobile) === customerMobile;
            const nameMatch = customerName && normalizeText(row.customerName) === customerName;
            const matches = idMatch || (!linkedElsewhere && (customerMobile ? mobileMatch && nameMatch : nameMatch));
            if (matches) insuranceMap.set(row.key, row);
          });
        });
        const normalizedInsurance = [...insuranceMap.values()].sort(
          (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
        );

        // Payment sheets for this customer's loan files only.
        let sheets = [];
        const loanIds = normalizedLoans.map((loan) => loan.loanId).filter((loanId) => loanId && loanId !== "—");
        if (loanIds.length) {
          try {
            const paymentRes = await paymentsApi.getAll({ loanIds: loanIds.join(","), limit: 500, noCount: 1 });
            const allowed = new Set(loanIds);
            sheets = toArray(getData(paymentRes)).filter((sheet) => allowed.has(sheet.loanId));
          } catch {
            errors.payments = "Payments could not be loaded.";
          }
        }

        if (!cancelled) {
          setCustomer(resolvedCustomer);
          setSummary(dashboard.summary || null);
          setLoans(normalizedLoans);
          setInsurance(normalizedInsurance);
          setPaymentSheets(sheets);
          setSectionErrors(errors);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load customer profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const paymentEntries = useMemo(
    () =>
      paymentSheets
        .flatMap(paymentEntriesFromSheet)
        .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)),
    [paymentSheets],
  );

  const stats = useMemo(() => {
    const disbursed = loans.filter((loan) => loan.state.key === "disbursed");
    const inProcess = loans.filter((loan) => loan.state.key === "process");
    const issued = insurance.filter((row) => row.isIssued);
    return {
      disbursedCount: disbursed.length,
      inProcessCount: inProcess.length,
      totalDisbursed: disbursed.reduce((total, loan) => total + loan.disbursedAmount, 0),
      totalApproved: loans.reduce((total, loan) => total + loan.approvedAmount, 0),
      monthlyEmi: disbursed.reduce((total, loan) => total + loan.emi, 0),
      runningEmiCount: disbursed.filter((loan) => loan.emi > 0 && (!loan.lastEmiDate || daysUntil(loan.lastEmiDate) >= 0)).length,
      issuedCount: issued.length,
      totalPremium: issued.reduce((total, row) => total + row.premium, 0),
      paidToShowroom: paymentEntries.filter((entry) => entry.direction === "paid").reduce((total, entry) => total + entry.amount, 0),
      receivedByAutocredits: paymentEntries.filter((entry) => entry.direction === "received").reduce((total, entry) => total + entry.amount, 0),
    };
  }, [loans, insurance, paymentEntries]);

  const activity = useMemo(() => {
    const items = [];
    const created = parseDate(customer?.createdOn || customer?.createdAt);
    if (created) items.push({ key: "customer", date: created, tone: "bg-slate-400", title: "Customer profile created", detail: customer?.customerId || "" });
    loans.forEach((loan) => {
      if (loan.createdAt) items.push({ key: `${loan.key}-c`, date: loan.createdAt, tone: "bg-sky-500", title: `Loan file ${loan.loanId} created`, detail: loan.vehicle });
      if (loan.approvedOn) items.push({ key: `${loan.key}-a`, date: loan.approvedOn, tone: "bg-indigo-500", title: `Loan ${loan.loanId} approved`, detail: [loan.bank, loan.approvedAmount ? formatCurrency(loan.approvedAmount) : ""].filter(Boolean).join(" · ") });
      if (loan.disbursedOn) items.push({ key: `${loan.key}-d`, date: loan.disbursedOn, tone: "bg-emerald-500", title: `Loan ${loan.loanId} disbursed`, detail: [loan.bank, loan.disbursedAmount ? formatCurrency(loan.disbursedAmount) : ""].filter(Boolean).join(" · ") });
    });
    insurance.forEach((row) => {
      if (row.createdAt) items.push({ key: `${row.key}-c`, date: row.createdAt, tone: "bg-violet-400", title: `Insurance case ${row.caseId} created`, detail: row.vehicle || row.registrationNumber });
      if (row.issuedOn) items.push({ key: `${row.key}-i`, date: row.issuedOn, tone: "bg-violet-600", title: "Insurance policy issued", detail: [row.insurer, row.policyNumber].filter(Boolean).join(" · ") });
    });
    paymentEntries.forEach((entry) => {
      if (!entry.date) return;
      items.push({
        key: entry.key,
        date: entry.date,
        tone: entry.direction === "paid" ? "bg-amber-500" : "bg-emerald-400",
        title: `${entry.direction === "paid" ? "Paid to showroom" : "Received"} ${formatCurrency(entry.amount)}`,
        detail: [entry.loanId, entry.label, entry.mode].filter(Boolean).join(" · "),
      });
    });
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [customer, loans, insurance, paymentEntries]);

  if (loading) {
    return (
      <div className="w-full space-y-4 pb-10">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900 xl:col-span-8" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900 xl:col-span-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full pb-10">
        <Alert
          type="error"
          showIcon
          message="Customer profile could not be loaded"
          description={error}
          action={
            <button type="button" onClick={() => navigate("/customers")} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              Back to customers
            </button>
          }
        />
      </div>
    );
  }

  const customerName = customer?.customerName || "Customer";
  const editId = customer?._id || id;
  const kycTag = KYC_TAG[normalizeText(customer?.kycStatus)] || { color: "default", label: customer?.kycStatus ? `KYC ${customer.kycStatus}` : "KYC not set" };
  const profileCompletion = Math.max(0, Math.min(100, asNumber(summary?.profileCompletion)));
  const avatarUrl = String(customer?.avatarUrl || customer?.photoUrl || "").trim();
  const age = ageFrom(customer?.dob);
  const monthlyIncome = firstPositive(customer?.monthlyIncome, customer?.salaryMonthly, customer?.monthlySalary);
  const currentAddress = [customer?.residenceAddress, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(", ");
  const permanentAddress = customer?.sameAsCurrentAddress
    ? "Same as current address"
    : [customer?.permanentAddress, customer?.permanentCity, customer?.permanentPincode].filter(Boolean).join(", ");
  const extraMobiles = toArray(customer?.extraMobiles).map((item) => (typeof item === "string" ? item : item?.mobile || item?.number)).filter(Boolean).join(", ");

  const loanColumns = [
    {
      title: "Loan file",
      key: "loanId",
      fixed: "left",
      width: 150,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.loanId}</p>
          <p className="text-xs text-slate-500">{formatDate(row.createdAt)}</p>
        </div>
      ),
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 220,
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{row.vehicle}</p>
          <p className="text-xs uppercase text-slate-500">{row.registrationNumber || "Reg. no. pending"}</p>
        </div>
      ),
    },
    { title: "Bank", dataIndex: "bank", key: "bank", width: 150, render: (value) => value || "—" },
    {
      title: "Amount",
      key: "amount",
      width: 150,
      align: "right",
      render: (_, row) => (
        <div className="tabular-nums">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(row.disbursedAmount || row.approvedAmount || row.requestedAmount)}</p>
          <p className="text-xs text-slate-500">{row.disbursedAmount ? "Disbursed" : row.approvedAmount ? "Approved" : "Requested"}</p>
        </div>
      ),
    },
    {
      title: "ROI · Tenure",
      key: "terms",
      width: 120,
      render: (_, row) => (
        <span className="tabular-nums">{row.roi ? `${row.roi}%` : "—"} · {row.tenureMonths ? `${row.tenureMonths} mo` : "—"}</span>
      ),
    },
    {
      title: "EMI",
      key: "emi",
      width: 160,
      align: "right",
      render: (_, row) => (
        <div className="tabular-nums">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.emi ? formatCurrency(row.emi) : "—"}</p>
          {row.firstEmiDate && <p className="text-xs text-slate-500">{formatDate(row.firstEmiDate)} – {formatDate(row.lastEmiDate)}</p>}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, row) => (
        <Tooltip title={row.stage ? `Stage: ${row.stage}` : undefined}>
          <Tag color={row.state.color} className="m-0">{row.state.label}</Tag>
        </Tooltip>
      ),
    },
  ];

  const insuranceColumns = [
    {
      title: "Case / Policy",
      key: "policy",
      width: 190,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.policyNumber || "Policy no. pending"}</p>
          <p className="text-xs text-slate-500">{row.caseId}</p>
        </div>
      ),
    },
    {
      title: "Insurer",
      key: "insurer",
      width: 200,
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{row.insurer || "—"}</p>
          <p className="text-xs text-slate-500">{[row.policyType, row.tenureLabel].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      ),
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 190,
      render: (_, row) => (
        <div>
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{row.vehicle || "—"}</p>
          <p className="text-xs uppercase text-slate-500">{row.registrationNumber || "—"}</p>
        </div>
      ),
    },
    {
      title: "Premium · IDV",
      key: "premium",
      width: 150,
      align: "right",
      render: (_, row) => (
        <div className="tabular-nums">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.premium ? formatCurrency(row.premium) : "—"}</p>
          <p className="text-xs text-slate-500">IDV {row.idv ? formatCurrency(row.idv) : "—"}</p>
        </div>
      ),
    },
    {
      title: "OD / TP expiry",
      key: "expiry",
      width: 190,
      render: (_, row) => (
        <div className="space-y-1 text-xs">
          {[["OD", row.odExpiry], ["TP", row.tpExpiry]].map(([label, date]) => {
            const badge = row.isIssued ? expiryBadge(date) : null;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="w-5 font-semibold text-slate-500">{label}</span>
                <span className="tabular-nums text-slate-800 dark:text-slate-200">{formatDate(date)}</span>
                {badge && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${badge.className}`}>{badge.label}</span>}
              </div>
            );
          })}
        </div>
      ),
    },
    { title: "Status", key: "status", width: 110, render: (_, row) => <Tag color={row.status.color} className="m-0">{row.status.label}</Tag> },
  ];

  const paymentColumns = [
    { title: "Date", key: "date", width: 120, render: (_, row) => formatDate(row.date) },
    { title: "Loan file", dataIndex: "loanId", key: "loanId", width: 140 },
    {
      title: "Type",
      key: "type",
      width: 220,
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{row.label}</p>
          <p className="text-xs text-slate-500">{row.party || "—"}</p>
        </div>
      ),
    },
    { title: "Mode", dataIndex: "mode", key: "mode", width: 120, render: (value) => value || "—" },
    {
      title: "Amount",
      key: "amount",
      width: 150,
      align: "right",
      render: (_, row) => (
        <span className={`font-semibold tabular-nums ${row.direction === "paid" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
          {row.direction === "paid" ? "−" : "+"}{formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const visibleActivity = showAllActivity ? activity : activity.slice(0, 10);

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <ArrowLeft size={16} /> Customers
        </button>
        <button
          type="button"
          onClick={() => navigate(`/customers/edit/${editId}`)}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Pencil size={14} /> Edit customer
        </button>
      </div>

      {/* Identity */}
      <section className={`${CARD} p-5 md:p-6`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold text-white md:h-24 md:w-24 md:text-3xl"
              style={{ backgroundColor: `hsl(${nameToHue(customerName)}, 55%, 45%)` }}
            >
              {avatarUrl && !avatarBroken ? (
                <img src={avatarUrl} alt={customerName} className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
              ) : (
                getInitials(customerName)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">{customerName}</h1>
                <Tag color={kycTag.color} className="m-0">{kycTag.label}</Tag>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {[customer?.customerId, customer?.customerType].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
                {customer?.primaryMobile && (
                  <a href={`tel:${customer.primaryMobile}`} className="inline-flex items-center gap-1.5 hover:text-sky-600"><Phone size={14} className="text-slate-400" />{customer.primaryMobile}</a>
                )}
                {customer?.email && (
                  <a href={`mailto:${customer.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-sky-600"><Mail size={14} className="text-slate-400" /><span className="truncate">{customer.email}</span></a>
                )}
                {(customer?.city || customer?.state) && (
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{[customer?.city, customer?.state].filter(Boolean).join(", ")}</span>
                )}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3 lg:min-w-[30rem]">
            <div className="col-span-2 bg-white px-4 py-3 dark:bg-slate-950 sm:col-span-1">
              <dt className={LABEL}>Profile completion</dt>
              <dd className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${profileCompletion >= 80 ? "bg-emerald-500" : profileCompletion >= 50 ? "bg-sky-500" : "bg-amber-500"}`}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{profileCompletion}%</span>
              </dd>
            </div>
            <div className="bg-white px-4 py-3 dark:bg-slate-950">
              <dt className={LABEL}>Customer since</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(customer?.createdOn || customer?.createdAt)}</dd>
            </div>
            <div className="bg-white px-4 py-3 dark:bg-slate-950">
              <dt className={LABEL}>Last updated</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(customer?.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Loan files" value={formatNumber(loans.length)} hint={`${stats.disbursedCount} disbursed · ${stats.inProcessCount} in process`} icon={BriefcaseBusiness} tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300" />
        <Kpi label="Total disbursed" value={formatCurrency(stats.totalDisbursed)} hint={`${formatCurrency(stats.totalApproved)} approved`} icon={Banknote} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" />
        <Kpi label="Monthly EMI" value={stats.monthlyEmi ? formatCurrency(stats.monthlyEmi) : "—"} hint={`${stats.runningEmiCount} running ${stats.runningEmiCount === 1 ? "loan" : "loans"}`} icon={CalendarClock} tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" />
        <Kpi label="Policies issued" value={formatNumber(stats.issuedCount)} hint={`${insurance.length} insurance ${insurance.length === 1 ? "case" : "cases"}`} icon={ShieldCheck} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" />
        <Kpi label="Total premium" value={formatCurrency(stats.totalPremium)} hint="Issued policies" icon={CheckCircle2} tone="bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300" />
        <Kpi label="Paid to showroom" value={formatCurrency(stats.paidToShowroom)} hint={`${formatCurrency(stats.receivedByAutocredits)} received`} icon={Wallet} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Records */}
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <Section title="Loan files" subtitle={`${formatNumber(loans.length)} ${loans.length === 1 ? "file" : "files"} linked to this customer`} bodyClassName="p-0">
            {sectionErrors.loans && <div className="px-5 pt-4"><SectionError text={sectionErrors.loans} /></div>}
            <Table
              size="middle"
              columns={loanColumns}
              dataSource={loans}
              pagination={loans.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
              rowKey="key"
              scroll={{ x: 1080 }}
              onRow={(row) => ({ onClick: () => navigate(`/loans/edit/${row.routeId}`), className: "cursor-pointer" })}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No loan files for this customer" /> }}
            />
          </Section>

          <Section title="Insurance" subtitle={`${formatNumber(insurance.length)} ${insurance.length === 1 ? "case" : "cases"} · ${stats.issuedCount} issued`} bodyClassName="p-0">
            {sectionErrors.insurance && <div className="px-5 pt-4"><SectionError text={sectionErrors.insurance} /></div>}
            <Table
              size="middle"
              columns={insuranceColumns}
              dataSource={insurance}
              pagination={insurance.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
              rowKey="key"
              scroll={{ x: 1030 }}
              onRow={(row) => ({ onClick: () => navigate(`/insurance/edit/${row.routeId}`), className: "cursor-pointer" })}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No insurance cases for this customer" /> }}
            />
          </Section>

          <Section
            title="Payments"
            subtitle="Showroom payments and AutoCredits receipts recorded on this customer's loan files"
            bodyClassName="p-0"
            action={
              <div className="flex gap-4 text-xs">
                <span className="text-slate-500">Paid <b className="tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(stats.paidToShowroom)}</b></span>
                <span className="text-slate-500">Received <b className="tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrency(stats.receivedByAutocredits)}</b></span>
              </div>
            }
          >
            {sectionErrors.payments && <div className="px-5 pt-4"><SectionError text={sectionErrors.payments} /></div>}
            <Table
              size="middle"
              columns={paymentColumns}
              dataSource={paymentEntries}
              pagination={paymentEntries.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
              rowKey="key"
              scroll={{ x: 750 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No payments recorded" /> }}
            />
          </Section>
        </div>

        {/* Details + activity */}
        <aside className="min-w-0 space-y-5 xl:col-span-4">
          <Section
            title="Customer details"
            action={
              <button type="button" onClick={() => navigate(`/customers/edit/${editId}`)} className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400">
                Edit
              </button>
            }
          >
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <DetailGroup
                icon={UserRound}
                title="Personal"
                rows={[
                  { label: "Date of birth", value: customer?.dob ? `${formatDate(customer.dob)}${age !== null ? ` (${age} yrs)` : ""}` : "" },
                  { label: "Gender", value: customer?.gender },
                  { label: "Marital status", value: customer?.maritalStatus },
                  { label: "Dependents", value: customer?.dependents },
                  { label: "Education", value: customer?.education },
                ]}
              />
              <DetailGroup
                icon={Phone}
                title="Contact & address"
                rows={[
                  { label: "Mobile", value: customer?.primaryMobile },
                  { label: "WhatsApp", value: customer?.whatsappNumber },
                  { label: "Other numbers", value: extraMobiles },
                  { label: "Email", value: customer?.email, wide: true },
                  { label: "Current address", value: currentAddress, wide: true },
                  { label: "Permanent address", value: permanentAddress, wide: true },
                ]}
              />
              <DetailGroup
                icon={BriefcaseBusiness}
                title="Employment & income"
                rows={[
                  { label: "Occupation", value: firstValue(customer?.occupationType, customer?.employmentType) },
                  { label: "Company", value: customer?.companyName },
                  { label: "Designation", value: customer?.designation },
                  { label: "Total experience", value: firstValue(customer?.totalExperience, customer?.totalExp) },
                  { label: "Monthly income", value: monthlyIncome ? formatCurrency(monthlyIncome) : "" },
                  { label: "Annual income", value: asNumber(customer?.annualIncome) ? formatCurrency(customer.annualIncome) : "" },
                ]}
              />
              <DetailGroup
                icon={IdCard}
                title="KYC"
                rows={[
                  { label: "PAN", value: customer?.panNumber },
                  { label: "Aadhaar", value: maskTail(firstValue(customer?.aadhaarNumber, customer?.aadharNumber)) },
                  { label: "Driving licence", value: customer?.dlNumber },
                  { label: "Passport", value: customer?.passportNumber },
                  { label: "GSTIN", value: customer?.gstNumber },
                ]}
              />
              <DetailGroup
                icon={Landmark}
                title="Bank account"
                rows={[
                  { label: "Bank", value: customer?.bankName },
                  { label: "Account no.", value: maskTail(customer?.accountNumber) },
                  { label: "IFSC", value: firstValue(customer?.ifscCode, customer?.ifsc) },
                  { label: "Branch", value: customer?.branch },
                  { label: "Account type", value: customer?.accountType },
                ]}
              />
              <DetailGroup
                icon={Users}
                title="References & nominee"
                rows={[
                  { label: "Reference 1", value: [customer?.reference1_name, customer?.reference1_mobile].filter(Boolean).join(" · ") },
                  { label: "Reference 2", value: [customer?.reference2_name, customer?.reference2_mobile].filter(Boolean).join(" · ") },
                  { label: "Nominee", value: [customer?.nomineeName, customer?.nomineeRelation].filter(Boolean).join(" · ") },
                ]}
              />
            </div>
          </Section>

          <Section title="Activity" subtitle="Dated events from loans, insurance and payments">
            {visibleActivity.length ? (
              <>
                <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
                  {visibleActivity.map((item) => (
                    <li key={item.key} className="relative">
                      <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-950 ${item.tone}`} />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      {item.detail && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(item.date)}</p>
                    </li>
                  ))}
                </ol>
                {activity.length > 10 && (
                  <button type="button" onClick={() => setShowAllActivity((value) => !value)} className="mt-4 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400">
                    {showAllActivity ? "Show less" : `Show all ${activity.length} events`}
                  </button>
                )}
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
            )}
          </Section>

          <div className="flex items-start gap-2 px-1 text-xs text-slate-400 dark:text-slate-500">
            <FileText size={14} className="mt-0.5 shrink-0" />
            <span>Loans are matched by customer link (or same mobile and name for older files). Insurance cases are matched by customer link, or by mobile and name.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
