import React, { useEffect, useMemo, useState } from "react";
import { Form, Modal, Spin } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";
import RepaymentIntelligencePanel from "../loan-form/post-file/RepaymentIntelligencePanel";
import LoanDocumentsModal from "./LoanDocumentsModal";
import BankStatusCard from "../loan-form/loan-approval/components/BankStatusCard";

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
};

const firstFilled = (...vals) =>
  vals.find(
    (v) =>
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === ""),
  );

const toNumber = (v) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;

const hasValue = (v) => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && !v.trim()) return false;
  if (Array.isArray(v)) return v.some((entry) => hasValue(entry));
  if (typeof v === "object") return Object.values(v).some((entry) => hasValue(entry));
  return true;
};

const asText = (v) => {
  if (!hasValue(v)) return "-";
  if (Array.isArray(v)) {
    const parts = v.map((item) => String(item ?? "").trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const asMoney = (v) => {
  const n = toNumber(v);
  if (!n) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const asDate = (v) => {
  if (!v) return "-";
  const d = dayjs.isDayjs(v) ? v : dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY") : "-";
};

const asDateTime = (v) => {
  if (!v) return "-";
  const d = dayjs.isDayjs(v) ? v : dayjs(v);
  return d.isValid() ? d.format("DD MMM YYYY, hh:mm A") : "-";
};

const asYesNo = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(s)) return "Yes";
  if (["no", "n", "false", "0"].includes(s)) return "No";
  return "-";
};

const formatByType = (raw, format) => {
  if (format === "money") return asMoney(raw);
  if (format === "date") return asDate(raw);
  if (format === "datetime" || format === "time") return asDateTime(raw);
  if (format === "yesno") return asYesNo(raw);
  return asText(raw);
};

const inferStageByPath = (path) => {
  const p = String(path || "").toLowerCase();
  if (
    p.includes("approval_") ||
    p.includes("approval") ||
    p.includes("banksdata")
  ) {
    return "approval";
  }
  if (
    p.includes("postfile_") ||
    p.includes("instrument") ||
    p.includes("dispatch") ||
    p.includes("disbursement") ||
    p.includes("maturity") ||
    p.includes("repayment") ||
    p.includes("loan_number")
  ) {
    return "postfile";
  }
  if (
    p.includes("delivery_") ||
    p.includes("invoice") ||
    p.includes("insurance_") ||
    p.includes("rc_") ||
    p.includes("yearofmanufacture")
  ) {
    return "delivery";
  }
  return "prefile";
};

const flattenSearchFields = (obj) => {
  const out = [];
  const seen = new Set();

  const walk = (value, path = "") => {
    if (value == null) return;

    if (dayjs.isDayjs(value) || typeof value !== "object") {
      const key = String(path || "").trim();
      const val = asText(value);
      if (!key || val === "-") return;
      const dedupe = `${key}::${val}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      out.push({
        label: key
          .replace(/\[(\d+)\]/g, " $1")
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/_/g, " ")
          .trim(),
        path: key,
        stage: inferStageByPath(key),
        subtab: null,
        value: val,
        source: "raw",
      });
      return;
    }

    if (Array.isArray(value)) {
      if (!value.length) return;
      const allPrimitive = value.every(
        (entry) => entry == null || typeof entry !== "object" || dayjs.isDayjs(entry),
      );
      if (allPrimitive) {
        const key = String(path || "").trim();
        const val = asText(value);
        if (!key || val === "-") return;
        const dedupe = `${key}::${val}`;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        out.push({
          label: key
            .replace(/\[(\d+)\]/g, " $1")
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/_/g, " ")
            .trim(),
          path: key,
          stage: inferStageByPath(key),
          subtab: null,
          value: val,
          source: "raw",
        });
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

const isCompanyCase = (data) => {
  const applicantType = String(
    firstFilled(data?.applicantType, data?.customerType, ""),
  )
    .trim()
    .toLowerCase();
  const companyType = String(data?.companyType || "").trim();
  return (
    applicantType === "company" ||
    applicantType.includes("corporate") ||
    Boolean(companyType) ||
    Boolean(data?.gstNumber) ||
    Boolean(data?.cinNumber) ||
    Boolean(data?.businessName)
  );
};

const normalizedLoanType = (data) =>
  String(firstFilled(data?.typeOfLoan, data?.loanType, ""))
    .trim()
    .toLowerCase();

const isNoLike = (v) => {
  if (v === false || v === 0) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "no" || s === "false" || s === "0";
};

const isYesLike = (v) => {
  if (v === true || v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "y";
};

const isFinancedNoCase = (data) => {
  const financeFlag = firstFilled(
    data?.isFinanced,
    data?.whereIsFinanced,
    data?.isFinanceRequired,
  );
  return isNoLike(financeFlag);
};

const rankBankStatus = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "disbursed") return 4;
  if (s === "approved") return 3;
  if (s === "documents required") return 2;
  if (s === "pending" || s === "under review") return 1;
  return 0;
};

const pickPrimaryApprovalBank = (loanData = {}) => {
  const banks = Array.isArray(loanData?.approval_banksData)
    ? loanData.approval_banksData
    : [];
  if (!banks.length) return null;

  return [...banks].sort((a, b) => {
    const statusDiff = rankBankStatus(b?.status) - rankBankStatus(a?.status);
    if (statusDiff !== 0) return statusDiff;
    const amountDiff = toNumber(b?.disbursedAmount || b?.loanAmount) - toNumber(a?.disbursedAmount || a?.loanAmount);
    if (amountDiff !== 0) return amountDiff;
    return toNumber(b?.tenure) - toNumber(a?.tenure);
  })[0];
};

const hasCoApplicantData = (data) => {
  if (data?.hasCoApplicant === true) return true;
  return Object.keys(data || {}).some((key) => key.startsWith("co_") && hasValue(data[key]));
};

const hasGuarantorData = (data) => {
  if (data?.hasGuarantor === true) return true;
  return Object.keys(data || {}).some((key) => key.startsWith("gu_") && hasValue(data[key]));
};

const hasSignatoryData = (data) => {
  return Object.keys(data || {}).some(
    (key) => key.startsWith("signatory_") && hasValue(data[key]),
  );
};

const resolveField = (field, data) => {
  const raw =
    typeof field.getValue === "function"
      ? field.getValue(data)
      : firstFilled(...(field.paths || []).map((p) => getByPath(data, p)));

  const applicable = typeof field.showWhen === "function" ? field.showWhen(data) : true;
  const hideIfEmpty = field.hideIfEmpty !== false;
  const visible =
    applicable && (!hideIfEmpty || hasValue(raw) || field.alwaysShow === true);

  return {
    ...field,
    raw,
    value: formatByType(raw, field.format),
    visible,
  };
};

const FieldRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className="max-w-[60%] break-words text-right text-sm font-semibold text-foreground">
      {value}
    </div>
  </div>
);

const FieldRowsBlock = ({ rows }) => (
  <div className="rounded-xl border border-border/70 bg-card px-3 py-1">
    {rows.map((field, idx) => (
      <div
        key={field.key}
        className={idx > 0 ? "border-t border-border/60" : ""}
      >
        <FieldRow label={field.label} value={field.value} />
      </div>
    ))}
  </div>
);

const FieldGrid = ({ fields, data, emptyText = "No applicable data for this case" }) => {
  const visibleFields = useMemo(
    () => fields.map((f) => resolveField(f, data)).filter((f) => f.visible),
    [fields, data],
  );

  if (!visibleFields.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
      {visibleFields.map((field) => (
        <div key={field.key} className="border-b border-border/60">
          <FieldRow label={field.label} value={field.value} />
        </div>
      ))}
    </div>
  );
};

const SplitSectionFields = ({
  data,
  leftTitle,
  rightTitle,
  leftFields = [],
  rightFields = [],
  leftTone = "sky",
  rightTone = "emerald",
  bottom = null,
}) => {
  const toneClass = (tone) => {
    if (tone === "emerald") {
      return "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20";
    }
    if (tone === "amber") {
      return "border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20";
    }
    if (tone === "violet") {
      return "border-violet-200 bg-violet-50/50 dark:border-violet-900/60 dark:bg-violet-950/20";
    }
    return "border-sky-200 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/20";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className={`rounded-xl border p-3 ${toneClass(leftTone)}`}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {leftTitle}
          </div>
          <FieldGrid fields={leftFields} data={data} />
        </div>
        <div className={`rounded-xl border p-3 ${toneClass(rightTone)}`}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {rightTitle}
          </div>
          <FieldGrid fields={rightFields} data={data} />
        </div>
      </div>
      {bottom}
    </div>
  );
};

const StagePanel = ({ title, icon, children, tone = "sky" }) => {
  const badgeTone =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        : tone === "violet"
          ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
          : "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300";

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${badgeTone}`}
        >
          <Icon name={icon} size={14} />
        </span>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
      </div>
      {children}
    </section>
  );
};

const extractBanks = (data) =>
  Array.isArray(data?.approval_banksData) ? data.approval_banksData : [];

const getApprovalBanksForViewer = (loanData, loanId) => {
  const banks = extractBanks(loanData).filter(
    (bank) =>
      hasValue(bank?.bankName) ||
      hasValue(bank?.status) ||
      hasValue(bank?.loanAmount) ||
      hasValue(bank?.disbursedAmount),
  );

  if (banks.length) {
    return banks.map((bank, idx) => ({
      ...bank,
      id: bank?.id ?? `${loanId || "loan"}_bank_${idx + 1}`,
      bankName: bank?.bankName || `Bank ${idx + 1}`,
      applicationId: bank?.applicationId || String(loanData?.loanId || loanData?.loan_number || "-"),
      status: bank?.status || "Pending",
      statusHistory: Array.isArray(bank?.statusHistory) ? bank.statusHistory : [],
    }));
  }

  if (
    hasValue(loanData?.approval_bankName) ||
    hasValue(loanData?.approval_status) ||
    hasValue(loanData?.approval_loanAmountApproved) ||
    hasValue(loanData?.approval_loanAmountDisbursed)
  ) {
    return [
      {
        id: `${loanId || "loan"}_primary_approval`,
        bankName: loanData?.approval_bankName || "Approval Bank",
        applicationId: String(loanData?.loanId || loanData?.loan_number || "-"),
        status: loanData?.approval_status || loanData?.status || "Pending",
        loanAmount:
          loanData?.approval_loanAmountApproved ??
          loanData?.approval_breakup_netLoanApproved ??
          0,
        disbursedAmount: loanData?.approval_loanAmountDisbursed ?? 0,
        interestRate: loanData?.approval_roi ?? loanData?.approval_interestRate ?? "",
        tenure: loanData?.approval_tenureMonths ?? "",
        processingFee: loanData?.approval_processingFees ?? "",
        statusHistory: [],
      },
    ];
  }

  return [];
};

const buildRepaymentViewerValues = (loanData = {}) => {
  const mapped = { ...loanData };
  const primaryBank = pickPrimaryApprovalBank(loanData);
  const setFallback = (target, sources) => {
    if (hasValue(mapped[target])) return;
    const val = firstFilled(...sources.map((key) => mapped[key]));
    if (hasValue(val)) mapped[target] = val;
  };

  setFallback("postfile_loanAmountApproved", [
    "approval_loanAmountApproved",
    "approval_breakup_netLoanApproved",
    "loanAmount",
    "financeExpectation",
    "loanExpected",
    "loan_expected",
    "postfile_loanAmountApproved",
  ]);
  setFallback("postfile_loanAmountDisbursed", [
    "approval_loanAmountDisbursed",
    "approval_disbursedAmount",
    "approval_loanAmountApproved",
    "approval_breakup_netLoanApproved",
    "disbursedAmount",
    "loanAmountDisbursed",
    "postfile_disbursedLoan",
    "postfile_disbursed_loan",
    "postfile_disbursed_loan_amount",
    "postfile_disbursedLoanTotal",
    "postfile_loanAmountDisbursed",
  ]);
  setFallback("postfile_roi", [
    "approval_roi",
    "approval_interestRate",
    "approval_interest_rate",
    "postfile_interestRate",
    "postfile_interest_rate",
    "rateOfInterest",
    "roi",
    "interestRate",
    "interest_rate",
  ]);
  setFallback("postfile_roiType", [
    "approval_roiType",
    "approval_roi_type",
    "postfile_interestType",
    "postfile_interest_type",
    "roiType",
    "roi_type",
  ]);
  setFallback("postfile_tenureMonths", [
    "approval_tenureMonths",
    "approval_tenure_months",
    "approval_tenure",
    "postfile_tenureMonths",
    "postfile_tenure",
    "postfile_tenure_months",
    "tenure",
    "tenureMonths",
    "loanTenureMonths",
  ]);
  setFallback("postfile_firstEmiDate", [
    "postfile_firstEmiDate",
    "postfile_first_emi_date",
    "postfile_first_emi_on",
    "approval_firstEmiDate",
    "approval_first_emi_date",
    "approval_firstEMIDate",
    "firstEmiDate",
    "firstEMIDate",
    "firstEmiOn",
    "first_emi_on",
    "first_emi_date",
  ]);
  setFallback("postfile_emiAmount", [
    "postfile_emiAmount",
    "postfile_emi_amount",
    "postfile_emi",
    "postfile_currentEmi",
    "currentEmi",
    "approval_emiAmount",
    "approval_emi_amount",
    "approval_emi",
    "emiAmount",
    "emi_amount",
    "emi",
  ]);
  setFallback("postfile_maturityDate", [
    "postfile_maturityDate",
    "postfile_maturity_date",
    "postfile_loanMaturityDate",
    "loanMaturityDate",
    "approval_maturityDate",
    "approval_maturity_date",
    "maturityDate",
    "maturity_date",
  ]);
  setFallback("postfile_bankName", ["approval_bankName"]);

  if (primaryBank) {
    if (!hasValue(mapped.postfile_loanAmountApproved) && hasValue(primaryBank.loanAmount)) {
      mapped.postfile_loanAmountApproved = primaryBank.loanAmount;
    }
    if (!hasValue(mapped.postfile_loanAmountDisbursed) && hasValue(primaryBank.disbursedAmount)) {
      mapped.postfile_loanAmountDisbursed = primaryBank.disbursedAmount;
    }
    if (!hasValue(mapped.postfile_roi) && hasValue(primaryBank.interestRate)) {
      mapped.postfile_roi = primaryBank.interestRate;
    }
    if (!hasValue(mapped.postfile_roi) && hasValue(primaryBank.roi)) {
      mapped.postfile_roi = primaryBank.roi;
    }
    if (!hasValue(mapped.postfile_tenureMonths) && hasValue(primaryBank.tenure)) {
      mapped.postfile_tenureMonths = primaryBank.tenure;
    }
    if (!hasValue(mapped.postfile_tenureMonths) && hasValue(primaryBank.tenureMonths)) {
      mapped.postfile_tenureMonths = primaryBank.tenureMonths;
    }
    if (!hasValue(mapped.postfile_firstEmiDate) && hasValue(primaryBank.firstEmiDate)) {
      mapped.postfile_firstEmiDate = primaryBank.firstEmiDate;
    }
    if (!hasValue(mapped.postfile_firstEmiDate) && hasValue(primaryBank.firstEMIDate)) {
      mapped.postfile_firstEmiDate = primaryBank.firstEMIDate;
    }
    if (!hasValue(mapped.postfile_emiAmount) && hasValue(primaryBank.emiAmount || primaryBank.emi)) {
      mapped.postfile_emiAmount = firstFilled(primaryBank.emiAmount, primaryBank.emi);
    }
    if (!hasValue(mapped.postfile_bankName) && hasValue(primaryBank.bankName)) {
      mapped.postfile_bankName = primaryBank.bankName;
    }
  }

  return mapped;
};

const tabHasData = (tab, loanData, context = {}) => {
  if (!tab) return false;

  if (tab.key === "ap_status_cards") {
    return getApprovalBanksForViewer(loanData, context.loanId).length > 0;
  }

  if (tab.key === "po_repayment_intelligence") {
    const mapped = buildRepaymentViewerValues(loanData);
    return (
      hasValue(mapped?.postfile_loanAmountDisbursed) ||
      (hasValue(mapped?.postfile_loanAmountApproved) &&
        hasValue(mapped?.postfile_roi) &&
        hasValue(mapped?.postfile_tenureMonths))
    );
  }

  if (tab.key === "po_instruments") {
    if (hasValue(loanData?.instrumentType)) return true;
    if (extractChequeRows(loanData).length > 0) return true;
    return (
      hasValue(loanData?.si_accountNumber) ||
      hasValue(loanData?.nach_accountNumber) ||
      hasValue(loanData?.ecs_accountNumber) ||
      hasValue(loanData?.ecs_bankName)
    );
  }

  const visibleFields = (tab.fields || [])
    .map((field) => resolveField(field, loanData))
    .filter((field) => field.visible && field.value !== "-");
  return visibleFields.length > 0;
};

const extractChequeRows = (data) => {
  const rows = [];
  for (let i = 1; i <= 30; i += 1) {
    const row = {
      id: i,
      number: data?.[`cheque_${i}_number`],
      bankName: data?.[`cheque_${i}_bankName`],
      accountNumber: data?.[`cheque_${i}_accountNumber`],
      date: data?.[`cheque_${i}_date`],
      amount: data?.[`cheque_${i}_amount`],
      tag: data?.[`cheque_${i}_tag`],
      favouring: data?.[`cheque_${i}_favouring`],
      signedBy: data?.[`cheque_${i}_signedBy`],
    };
    const hasChequeData = [
      row.number,
      row.bankName,
      row.accountNumber,
      row.date,
      row.amount,
      row.tag,
      row.favouring,
      row.signedBy,
    ].some((v) => hasValue(v));
    if (hasChequeData) rows.push(row);
  }
  return rows;
};

const STAGE_META = {
  prefile: {
    label: "Pre-File",
    icon: "ClipboardList",
    tone:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200",
  },
  approval: {
    label: "Approval",
    icon: "BadgeCheck",
    tone:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
  },
  postfile: {
    label: "Post-File",
    icon: "Files",
    tone:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  },
  delivery: {
    label: "Delivery",
    icon: "Truck",
    tone:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200",
  },
};

const initialToStage = {
  profile: "prefile",
  prefile: "prefile",
  approval: "approval",
  postfile: "postfile",
  postfile_repayment: "postfile",
  po_repayment_intelligence: "postfile",
  delivery: "delivery",
  payout: "postfile",
};

const getStageSubTabs = (stage, data, context = {}) => {
  const isCompany = isCompanyCase(data);
  const loanType = normalizedLoanType(data);
  const isNewCar = loanType === "new car";
  const isUsedCar = loanType === "used car";
  const isCashIn = loanType === "car cash-in";
  const isRefinance = loanType === "refinance";
  const signatorySameAsCo = isYesLike(data?.signatorySameAsCoApplicant);

  if (stage === "prefile") {
    const applicantFields = [
      { key: "customerName", label: "Customer Name", paths: ["customerName"] },
      { key: "applicantType", label: "Applicant Category", paths: ["applicantType", "customerType"] },
      { key: "dob", label: isCompany ? "Date of Incorporation" : "Date of Birth", paths: ["dob"], format: "date" },
      { key: "gender", label: "Gender", paths: ["gender"], showWhen: () => !isCompany },
      { key: "maritalStatus", label: "Marital Status", paths: ["maritalStatus"], showWhen: () => !isCompany },
      { key: "motherName", label: "Mother's Name", paths: ["motherName"], showWhen: () => !isCompany },
      { key: "sdwOf", label: "Father / Husband Name", paths: ["sdwOf", "fatherName"], showWhen: () => !isCompany },
      { key: "dependents", label: "Dependents", paths: ["dependents"], showWhen: () => !isCompany },
      { key: "education", label: "Education", paths: ["education"] },
      { key: "houseType", label: "House", paths: ["houseType"], showWhen: () => !isCompany },
      { key: "addressType", label: "Address Type", paths: ["addressType"], showWhen: () => !isCompany },
      { key: "identityType", label: "Identity Proof", paths: ["identityProofType"], showWhen: () => !isCompany },
      { key: "identityNo", label: "Identity Proof Number", paths: ["identityProofNumber"], showWhen: () => !isCompany },
      { key: "addressProofType", label: "Address Proof Type", paths: ["addressProofType"], showWhen: () => !isCompany },
      { key: "addressProofNumber", label: "Address Proof Number", paths: ["addressProofNumber"], showWhen: () => !isCompany },
      { key: "primaryMobile", label: "Primary Mobile", paths: ["primaryMobile", "mobileNo", "customerMobile"] },
      { key: "extraMobiles", label: "Extra Mobiles", paths: ["extraMobiles"] },
      { key: "email", label: "Email", paths: ["email"] },
      { key: "contactPersonName", label: "Contact Person Name", paths: ["contactPersonName"], showWhen: () => isCompany },
      { key: "contactPersonMobile", label: "Contact Person Mobile", paths: ["contactPersonMobile"], showWhen: () => isCompany },
      { key: "panNumber", label: "PAN", paths: ["panNumber"] },
      { key: "aadhaarNumber", label: "Aadhaar", paths: ["aadhaarNumber", "aadharNumber"], showWhen: () => !isCompany },
      { key: "gstNumber", label: "GST Number", paths: ["gstNumber"], showWhen: () => isCompany },
    ];

    const occupationalFields = [
      { key: "occupationType", label: "Occupation", paths: ["occupationType"] },
      { key: "isMSME", label: "Is MSME", paths: ["isMSME"], format: "yesno" },
      { key: "professionalType", label: "Professional Type", paths: ["professionalType"] },
      { key: "companyType", label: "Company Type", paths: ["companyType"] },
      { key: "businessNature", label: "Business Nature", paths: ["businessNature"] },
      { key: "experienceCurrent", label: "Current Experience", paths: ["experienceCurrent", "currentExp"] },
      { key: "totalExperience", label: "Total Experience", paths: ["totalExperience", "totalExp"] },
      { key: "designation", label: "Designation", paths: ["designation"] },
      { key: "companyName", label: "Company Name", paths: ["companyName"] },
      { key: "employmentAddress", label: "Employment Address", paths: ["employmentAddress"] },
      { key: "employmentPincode", label: "Employment Pincode", paths: ["employmentPincode"] },
      { key: "employmentCity", label: "Employment City", paths: ["employmentCity"] },
      { key: "employmentPhone", label: "Employment Phone", paths: ["employmentPhone"] },
      { key: "officialEmail", label: "Official Email", paths: ["officialEmail"] },
    ];

    const incomeBankFields = [
      { key: "totalIncomeITR", label: "Total Income (ITR)", paths: ["totalIncomeITR"], format: "money" },
      { key: "monthlyIncome", label: "Monthly Income", paths: ["monthlyIncome"], format: "money" },
      { key: "salaryMonthly", label: "Monthly Salary", paths: ["salaryMonthly"], format: "money" },
      { key: "ifsc", label: "IFSC", paths: ["ifsc", "ifscCode"] },
      { key: "bankName", label: "Bank Name", paths: ["bankName"] },
      { key: "branch", label: "Branch / Address", paths: ["branch"] },
      { key: "accountNumber", label: "Applicant Account Number", paths: ["accountNumber"] },
      { key: "accountSinceYears", label: "Account Since (Years)", paths: ["accountSinceYears"] },
      { key: "openedIn", label: "Opened In", paths: ["openedIn"] },
      { key: "accountType", label: "Account Type", paths: ["accountType"] },
    ];

    const addressFields = [
      { key: "residenceAddress", label: "Present Address", paths: ["residenceAddress"] },
      { key: "pincode", label: "Present Pincode", paths: ["pincode"] },
      { key: "city", label: "Present City", paths: ["city"] },
      { key: "yearsInCurrentCity", label: "Years in Current City", paths: ["yearsInCurrentCity"] },
      { key: "yearsInCurrentHouse", label: "Years in Current Residence", paths: ["yearsInCurrentHouse"] },
      { key: "sameAsCurrentAddress", label: "Permanent Same as Current", paths: ["sameAsCurrentAddress"], format: "yesno" },
      { key: "permanentAddress", label: "Permanent Address", paths: ["permanentAddress"] },
      { key: "permanentPincode", label: "Permanent Pincode", paths: ["permanentPincode"] },
      { key: "permanentCity", label: "Permanent City", paths: ["permanentCity"] },
    ];

    const reference1Fields = [
      { key: "ref1Name", label: "Reference 1 Name", paths: ["reference1.name", "reference1_name"] },
      { key: "ref1Mobile", label: "Reference 1 Mobile", paths: ["reference1.mobile", "reference1_mobile"] },
      { key: "ref1Address", label: "Reference 1 Address", paths: ["reference1.address", "reference1_address"] },
      { key: "ref1Pincode", label: "Reference 1 Pincode", paths: ["reference1.pincode", "reference1_pincode"] },
      { key: "ref1City", label: "Reference 1 City", paths: ["reference1.city", "reference1_city"] },
      { key: "ref1Relation", label: "Reference 1 Relation", paths: ["reference1.relation", "reference1_relation"] },
    ];

    const reference2Fields = [
      { key: "ref2Name", label: "Reference 2 Name", paths: ["reference2.name", "reference2_name"] },
      { key: "ref2Mobile", label: "Reference 2 Mobile", paths: ["reference2.mobile", "reference2_mobile"] },
      { key: "ref2Address", label: "Reference 2 Address", paths: ["reference2.address", "reference2_address"] },
      { key: "ref2Pincode", label: "Reference 2 Pincode", paths: ["reference2.pincode", "reference2_pincode"] },
      { key: "ref2City", label: "Reference 2 City", paths: ["reference2.city", "reference2_city"] },
      { key: "ref2Relation", label: "Reference 2 Relation", paths: ["reference2.relation", "reference2_relation"] },
    ];

    const coPersonalFields = [
      { key: "co_name", label: "Name", paths: ["co_customerName", "co_name"] },
      { key: "co_mother", label: "Mother's Name", paths: ["co_motherName"] },
      { key: "co_father", label: "Father / Husband", paths: ["co_fatherName"] },
      { key: "co_dob", label: "DOB", paths: ["co_dob"], format: "date" },
      { key: "co_gender", label: "Gender", paths: ["co_gender"] },
      { key: "co_marital", label: "Marital Status", paths: ["co_maritalStatus"] },
      { key: "co_dependents", label: "Dependents", paths: ["co_dependents"] },
      { key: "co_education", label: "Education", paths: ["co_education"] },
      { key: "co_house", label: "House", paths: ["co_houseType"] },
      { key: "co_mobile", label: "Primary Mobile", paths: ["co_primaryMobile", "co_mobile"] },
      { key: "co_address", label: "Address", paths: ["co_address"] },
      { key: "co_pincode", label: "Pincode", paths: ["co_pincode"] },
      { key: "co_city", label: "City", paths: ["co_city"] },
      { key: "co_pan", label: "PAN", paths: ["co_pan"] },
      { key: "co_aadhaar", label: "Aadhaar", paths: ["co_aadhaar"] },
    ];

    const coOccupationalFields = [
      { key: "co_occupation", label: "Occupation", paths: ["co_occupation"] },
      { key: "co_professionalType", label: "Professional Type", paths: ["co_professionalType"] },
      { key: "co_companyType", label: "Company Type", paths: ["co_companyType"] },
      { key: "co_businessNature", label: "Business Nature", paths: ["co_businessNature"] },
      { key: "co_designation", label: "Designation", paths: ["co_designation"] },
      { key: "co_currentExperience", label: "Current Exp", paths: ["co_currentExperience"] },
      { key: "co_totalExperience", label: "Total Exp", paths: ["co_totalExperience"] },
      { key: "co_companyName", label: "Company Name", paths: ["co_companyName"] },
      { key: "co_companyAddress", label: "Company Address", paths: ["co_companyAddress"] },
      { key: "co_companyPincode", label: "Company Pincode", paths: ["co_companyPincode"] },
      { key: "co_companyCity", label: "Company City", paths: ["co_companyCity"] },
      { key: "co_companyPhone", label: "Company Phone", paths: ["co_companyPhone"] },
      { key: "signatorySame", label: "Authorised Signatory Same as Co-Applicant", paths: ["signatorySameAsCoApplicant"], format: "yesno" },
      { key: "sg_name", label: "Signatory Name", paths: ["signatory_customerName", "signatoryName"], showWhen: () => signatorySameAsCo },
      { key: "sg_mobile", label: "Signatory Mobile", paths: ["signatory_primaryMobile", "signatoryMobile"], showWhen: () => signatorySameAsCo },
      { key: "sg_designation", label: "Signatory Designation", paths: ["signatory_designation", "signatoryDesignation"], showWhen: () => signatorySameAsCo },
    ];

    const signatoryFields = [
      { key: "signatorySame", label: "Same as Co-Applicant", paths: ["signatorySameAsCoApplicant"], format: "yesno" },
      { key: "sg_name", label: "Name", paths: ["signatory_customerName", "signatoryName"] },
      { key: "sg_mobile", label: "Primary Mobile", paths: ["signatory_primaryMobile", "signatoryMobile"] },
      { key: "sg_address", label: "Address", paths: ["signatory_address", "signatoryAddress"] },
      { key: "sg_pincode", label: "Pincode", paths: ["signatory_pincode", "signatoryPincode"] },
      { key: "sg_city", label: "City", paths: ["signatory_city", "signatoryCity"] },
      { key: "sg_dob", label: "DOB", paths: ["signatory_dob"], format: "date" },
      { key: "sg_gender", label: "Gender", paths: ["signatory_gender"] },
      { key: "sg_designation", label: "Designation", paths: ["signatory_designation", "signatoryDesignation"] },
      { key: "sg_pan", label: "PAN", paths: ["signatory_pan"] },
      { key: "sg_aadhaar", label: "Aadhaar", paths: ["signatory_aadhaar"] },
    ];

    const vehicleCoreFields = [
      { key: "typeOfLoan", label: "Type of Loan", paths: ["typeOfLoan", "loanType"] },
      { key: "usage", label: "Usage", paths: ["usage"] },
      { key: "purposeOfLoan", label: "Purpose of Loan", paths: ["purposeOfLoan"], showWhen: () => isCashIn || isRefinance },
      { key: "vehicleMake", label: "Make", paths: ["vehicleMake"] },
      { key: "vehicleModel", label: "Model", paths: ["vehicleModel"] },
      { key: "vehicleVariant", label: "Variant", paths: ["vehicleVariant"] },
      { key: "vehicleFuelType", label: "Fuel Type", paths: ["vehicleFuelType"] },
      { key: "vehicleRegNo", label: "Vehicle Reg Number", paths: ["vehicleRegNo", "vehicleRegdNumber"], showWhen: () => !isNewCar },
      { key: "valuation", label: "Valuation", paths: ["valuation"], format: "money", showWhen: () => !isNewCar },
      { key: "boughtInYear", label: "Bought In (Year)", paths: ["boughtInYear"], showWhen: () => !isNewCar },
      { key: "hypothecation", label: "Hypothecation", paths: ["hypothecation"], showWhen: () => !isNewCar },
      { key: "hypothecationBank", label: "Hypothecation Bank", paths: ["hypothecationBank"], showWhen: (d) => !isNewCar && String(d?.hypothecation || "").toLowerCase() === "yes" },
      { key: "registrationCity", label: "Registration City", paths: ["registrationCity"], showWhen: () => isNewCar || isUsedCar || isCashIn || isRefinance },
    ];

    const vehiclePricingFields = [
      { key: "exShowroomPrice", label: "Ex-Showroom", paths: ["exShowroomPrice"], format: "money", showWhen: () => isNewCar },
      { key: "insuranceCost", label: "Insurance Cost", paths: ["insuranceCost"], format: "money", showWhen: () => isNewCar },
      { key: "roadTax", label: "Road Tax", paths: ["roadTax"], format: "money", showWhen: () => isNewCar },
      { key: "accessoriesAmount", label: "Accessories", paths: ["accessoriesAmount"], format: "money", showWhen: () => isNewCar },
      { key: "dealerDiscount", label: "Dealer Discount", paths: ["dealerDiscount"], format: "money", showWhen: () => isNewCar },
      { key: "manufacturerDiscount", label: "Manufacturer Discount", paths: ["manufacturerDiscount"], format: "money", showWhen: () => isNewCar },
      { key: "marginMoney", label: "Margin Money", paths: ["marginMoney"], format: "money", showWhen: () => isNewCar },
      { key: "advanceEmi", label: "Advance EMI", paths: ["advanceEmi"], format: "money", showWhen: () => isNewCar },
      { key: "tradeInValue", label: "Trade-in Value", paths: ["tradeInValue"], format: "money", showWhen: () => isNewCar },
      { key: "otherDiscounts", label: "Other Discounts", paths: ["otherDiscounts"], format: "money", showWhen: () => isNewCar },
      { key: "showroomDealerName", label: "Showroom / Dealer Name", paths: ["showroomDealerName", "delivery_dealerName"], showWhen: () => isNewCar },
      { key: "showroomDealerContactPerson", label: "Showroom Contact Person", paths: ["showroomDealerContactPerson"], showWhen: () => isNewCar },
      { key: "showroomDealerContactNumber", label: "Showroom Contact Number", paths: ["showroomDealerContactNumber"], showWhen: () => isNewCar },
      { key: "showroomDealerAddress", label: "Showroom Address", paths: ["showroomDealerAddress", "delivery_dealerAddress"], showWhen: () => isNewCar },
      { key: "registerSameAsAadhaar", label: isCompany ? "Registered at GST/Office Address" : "Registered at Aadhaar Address", paths: ["registerSameAsAadhaar"], format: "yesno", showWhen: () => isNewCar },
      { key: "registerSameAsPermanent", label: "Registered at Permanent Address", paths: ["registerSameAsPermanent"], format: "yesno", showWhen: (d) => isNewCar && String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" },
      { key: "registrationAddress", label: "Registration Address", paths: ["registrationAddress"], showWhen: (d) => isNewCar && String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
      { key: "registrationPincode", label: "Registration Pincode", paths: ["registrationPincode"], showWhen: (d) => isNewCar && String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
    ];

    const recordFields = [
      { key: "leadDate", label: "Lead Date", paths: ["leadDate", "lead_date"], format: "date" },
      { key: "leadTime", label: "Lead Time", paths: ["leadTime", "lead_time"], format: "datetime" },
      { key: "leadSourceType", label: "Lead Source Type", paths: ["leadSourceType", "lead_source_type"] },
      { key: "receivingDate", label: "Receiving Date", paths: ["receivingDate"], format: "date" },
      { key: "receivingTime", label: "Receiving Time", paths: ["receivingTime"] },
      { key: "recordSource", label: "Source (Direct/Indirect)", paths: ["recordSource"] },
      { key: "sourceName", label: "Source Name", paths: ["sourceName"] },
      { key: "referenceName", label: "Reference Name", paths: ["referenceName"] },
      { key: "referenceNumber", label: "Reference Number", paths: ["referenceNumber"] },
      { key: "dealerMobile", label: "Dealer Mobile", paths: ["dealerMobile"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
      { key: "dealerAddress", label: "Dealer Address", paths: ["dealerAddress"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
      { key: "payoutApplicable", label: "Payout Applicable", paths: ["payoutApplicable"], format: "yesno", showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
      { key: "prefile_sourcePayoutPercentage", label: "Source Payout %", paths: ["prefile_sourcePayoutPercentage"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" && String(d?.payoutApplicable || "").toLowerCase() === "yes" },
      { key: "dealtBy", label: "Dealt By", paths: ["dealtBy"] },
      { key: "docsPreparedBy", label: "Docs Prepared By", paths: ["docsPreparedBy"] },
    ];

    return [
      {
        key: "pf_app_occ",
        label: "Applicant + Occupational",
        icon: "UserRound",
        fields: [...applicantFields, ...occupationalFields],
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Personal Details"
            rightTitle="Occupational Details"
            leftFields={applicantFields}
            rightFields={occupationalFields}
            leftTone="sky"
            rightTone="emerald"
          />
        ),
      },
      {
        key: "pf_income_address",
        label: "Income + Address + References",
        icon: "Landmark",
        fields: [...incomeBankFields, ...addressFields, ...reference1Fields, ...reference2Fields],
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Income & Banking"
            rightTitle="Address Details"
            leftFields={incomeBankFields}
            rightFields={addressFields}
            leftTone="emerald"
            rightTone="violet"
            bottom={(
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/25">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Reference 1
                  </div>
                  <FieldGrid fields={reference1Fields} data={loanData} />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/25">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Reference 2
                  </div>
                  <FieldGrid fields={reference2Fields} data={loanData} />
                </div>
              </div>
            )}
          />
        ),
      },
      {
        key: "pf_coapp",
        label: signatorySameAsCo
          ? "Co-Applicant + Auth Signatory"
          : "Co-Applicant",
        icon: "Users",
        visible: hasCoApplicantData(data),
        fields: [...coPersonalFields, ...coOccupationalFields],
        render: (loanData) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <div className="text-xs font-semibold text-foreground">Co-Applicant Details</div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  signatorySameAsCo
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {signatorySameAsCo ? "Auth Signatory: Same as Co-Applicant" : "Auth Signatory: Separate"}
              </span>
            </div>
            <SplitSectionFields
              data={loanData}
              leftTitle="Personal Details"
              rightTitle="Occupational Details"
              leftFields={coPersonalFields}
              rightFields={coOccupationalFields}
              leftTone="sky"
              rightTone="emerald"
            />
          </div>
        ),
      },
      {
        key: "pf_guarantor",
        label: "Guarantor",
        icon: "ShieldCheck",
        visible: hasGuarantorData(data),
        fields: [
          { key: "gu_name", label: "Name", paths: ["gu_customerName"] },
          { key: "gu_mother", label: "Mother's Name", paths: ["gu_motherName"] },
          { key: "gu_father", label: "Father / Husband", paths: ["gu_fatherName"] },
          { key: "gu_dob", label: "DOB", paths: ["gu_dob"], format: "date" },
          { key: "gu_gender", label: "Gender", paths: ["gu_gender"] },
          { key: "gu_marital", label: "Marital Status", paths: ["gu_maritalStatus"] },
          { key: "gu_dependents", label: "Dependents", paths: ["gu_dependents"] },
          { key: "gu_education", label: "Education", paths: ["gu_education"] },
          { key: "gu_house", label: "House", paths: ["gu_houseType"] },
          { key: "gu_mobile", label: "Primary Mobile", paths: ["gu_primaryMobile"] },
          { key: "gu_address", label: "Address", paths: ["gu_address"] },
          { key: "gu_pincode", label: "Pincode", paths: ["gu_pincode"] },
          { key: "gu_city", label: "City", paths: ["gu_city"] },
          { key: "gu_pan", label: "PAN", paths: ["gu_pan"] },
          { key: "gu_aadhaar", label: "Aadhaar", paths: ["gu_aadhaar"] },
          { key: "gu_occupation", label: "Occupation", paths: ["gu_occupation"] },
          { key: "gu_professionalType", label: "Professional Type", paths: ["gu_professionalType"] },
          { key: "gu_companyType", label: "Company Type", paths: ["gu_companyType"] },
          { key: "gu_businessNature", label: "Business Nature", paths: ["gu_businessNature"] },
          { key: "gu_designation", label: "Designation", paths: ["gu_designation"] },
          { key: "gu_currentExperience", label: "Current Exp", paths: ["gu_currentExperience"] },
          { key: "gu_totalExperience", label: "Total Exp", paths: ["gu_totalExperience"] },
          { key: "gu_companyName", label: "Company Name", paths: ["gu_companyName"] },
          { key: "gu_companyAddress", label: "Company Address", paths: ["gu_companyAddress"] },
          { key: "gu_companyPincode", label: "Company Pincode", paths: ["gu_companyPincode"] },
          { key: "gu_companyCity", label: "Company City", paths: ["gu_companyCity"] },
          { key: "gu_companyPhone", label: "Company Phone", paths: ["gu_companyPhone"] },
        ],
      },
      {
        key: "pf_signatory",
        label: "Auth Signatory",
        icon: "FilePen",
        visible: (isCompany || hasSignatoryData(data)) && !signatorySameAsCo,
        fields: signatoryFields,
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Personal & Contact"
            rightTitle="Identity & Role"
            leftFields={[
              { key: "sg_name", label: "Name", paths: ["signatory_customerName", "signatoryName"] },
              { key: "sg_mobile", label: "Primary Mobile", paths: ["signatory_primaryMobile", "signatoryMobile"] },
              { key: "sg_address", label: "Address", paths: ["signatory_address", "signatoryAddress"] },
              { key: "sg_pincode", label: "Pincode", paths: ["signatory_pincode", "signatoryPincode"] },
              { key: "sg_city", label: "City", paths: ["signatory_city", "signatoryCity"] },
              { key: "sg_dob", label: "DOB", paths: ["signatory_dob"], format: "date" },
              { key: "sg_gender", label: "Gender", paths: ["signatory_gender"] },
            ]}
            rightFields={[
              { key: "signatorySame", label: "Same as Co-Applicant", paths: ["signatorySameAsCoApplicant"], format: "yesno" },
              { key: "sg_designation", label: "Designation", paths: ["signatory_designation", "signatoryDesignation"] },
              { key: "sg_pan", label: "PAN", paths: ["signatory_pan"] },
              { key: "sg_aadhaar", label: "Aadhaar", paths: ["signatory_aadhaar"] },
            ]}
            leftTone="sky"
            rightTone="amber"
          />
        ),
      },
      {
        key: "pf_vehicle",
        label: "Vehicle & Loan",
        icon: "CarFront",
        fields: [...vehicleCoreFields, ...vehiclePricingFields],
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Vehicle Core"
            rightTitle={isNewCar ? "Pricing & Registration" : "Loan Context"}
            leftFields={vehicleCoreFields}
            rightFields={vehiclePricingFields}
            leftTone="violet"
            rightTone="amber"
          />
        ),
      },
      {
        key: "pf_record",
        label: "Record Details",
        icon: "ClipboardCheck",
        fields: recordFields,
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Lead & Source"
            rightTitle="Record & Handling"
            leftFields={[
              { key: "leadDate", label: "Lead Date", paths: ["leadDate", "lead_date"], format: "date" },
              { key: "leadTime", label: "Lead Time", paths: ["leadTime", "lead_time"], format: "datetime" },
              { key: "leadSourceType", label: "Lead Source Type", paths: ["leadSourceType", "lead_source_type"] },
              { key: "recordSource", label: "Source (Direct/Indirect)", paths: ["recordSource"] },
              { key: "sourceName", label: "Source Name", paths: ["sourceName"] },
              { key: "referenceName", label: "Reference Name", paths: ["referenceName"] },
              { key: "referenceNumber", label: "Reference Number", paths: ["referenceNumber"] },
            ]}
            rightFields={[
              { key: "receivingDate", label: "Receiving Date", paths: ["receivingDate"], format: "date" },
              { key: "receivingTime", label: "Receiving Time", paths: ["receivingTime"] },
              { key: "dealerMobile", label: "Dealer Mobile", paths: ["dealerMobile"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
              { key: "dealerAddress", label: "Dealer Address", paths: ["dealerAddress"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
              { key: "payoutApplicable", label: "Payout Applicable", paths: ["payoutApplicable"], format: "yesno", showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" },
              { key: "prefile_sourcePayoutPercentage", label: "Source Payout %", paths: ["prefile_sourcePayoutPercentage"], showWhen: (d) => String(d?.recordSource || "").toLowerCase() === "indirect" && String(d?.payoutApplicable || "").toLowerCase() === "yes" },
              { key: "dealtBy", label: "Dealt By", paths: ["dealtBy"] },
              { key: "docsPreparedBy", label: "Docs Prepared By", paths: ["docsPreparedBy"] },
            ]}
            leftTone="violet"
            rightTone="emerald"
          />
        ),
      },
    ].filter((tab) => tab.visible !== false);
  }

  if (stage === "approval") {
    return [
      {
        key: "ap_status_cards",
        label: "Bank Status",
        icon: "BadgeCheck",
        render: (loanData) => {
          const banks = getApprovalBanksForViewer(loanData, context.loanId);
          if (!banks.length) {
            return (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No approval bank status available.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {banks.map((bank) => (
                <BankStatusCard
                  key={bank.id}
                  bank={bank}
                  form={context.form}
                  readOnly
                  allowDetailsInReadOnly
                />
              ))}
            </div>
          );
        },
        fields: [
          { key: "approval_bankName", label: "Approval Bank", paths: ["approval_bankName"] },
          { key: "approval_status", label: "Approval Status", paths: ["approval_status", "status"] },
          { key: "approval_approvalDate", label: "Approval Date", paths: ["approval_approvalDate"], format: "date" },
          { key: "approval_disbursedDate", label: "Disbursement Date", paths: ["approval_disbursedDate", "disbursement_date"], format: "date" },
          { key: "approval_loanAmountApproved", label: "Loan Amount Approved", paths: ["approval_loanAmountApproved"], format: "money" },
          { key: "approval_loanAmountDisbursed", label: "Loan Amount Disbursed", paths: ["approval_loanAmountDisbursed"], format: "money" },
          { key: "approval_roi", label: "ROI", paths: ["approval_roi", "approval_interestRate"] },
          { key: "approval_tenureMonths", label: "Tenure (Months)", paths: ["approval_tenureMonths"] },
          { key: "approval_processingFees", label: "Processing Fees", paths: ["approval_processingFees"], format: "money" },
          { key: "approval_firstEmiDate", label: "First EMI Date", paths: ["approval_firstEmiDate"], format: "date" },
          { key: "emi", label: "EMI", paths: ["emi"], format: "money" },
          { key: "mob", label: "MOB", paths: ["mob"] },
          { key: "approval_breakup_netLoanApproved", label: "Net Loan Approved", paths: ["approval_breakup_netLoanApproved"], format: "money" },
          { key: "approval_breakup_creditAssured", label: "Credit Assured", paths: ["approval_breakup_creditAssured"], format: "money" },
          { key: "approval_breakup_insuranceFinance", label: "Insurance Finance", paths: ["approval_breakup_insuranceFinance"], format: "money" },
          { key: "approval_breakup_ewFinance", label: "EW Finance", paths: ["approval_breakup_ewFinance"], format: "money" },
          { key: "payoutPercentage", label: "Payout %", paths: ["payoutPercentage"] },
        ],
      },
    ];
  }

  if (stage === "postfile") {
    return [
      {
        key: "po_reconcile",
        label: "Reconciliation",
        icon: "Stamp",
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Approval vs Disbursement"
            rightTitle="EMI & Tenure Setup"
            leftFields={[
              { key: "postfile_bankName", label: "Post-File Bank", paths: ["postfile_bankName"] },
              { key: "postfile_approvalDate", label: "Approval Date", paths: ["postfile_approvalDate"], format: "date" },
              { key: "postfile_loanAmountApproved", label: "Loan Amount Approved", paths: ["postfile_loanAmountApproved"], format: "money" },
              { key: "postfile_loanAmountDisbursed", label: "Loan Amount Disbursed", paths: ["postfile_loanAmountDisbursed"], format: "money" },
              { key: "postfile_disbursedLoanTotal", label: "Disbursed Loan Total", paths: ["postfile_disbursedLoanTotal"], format: "money" },
              { key: "postfile_sameAsApproved", label: "Same as Approved", paths: ["postfile_sameAsApproved"], format: "yesno" },
            ]}
            rightFields={[
              { key: "postfile_roiType", label: "ROI Type", paths: ["postfile_roiType"] },
              { key: "postfile_roi", label: "ROI", paths: ["postfile_roi"] },
              { key: "postfile_emiMode", label: "EMI Mode", paths: ["postfile_emiMode"] },
              { key: "postfile_emiPlan", label: "EMI Plan", paths: ["postfile_emiPlan"] },
              { key: "postfile_tenureMonths", label: "Tenure (Months)", paths: ["postfile_tenureMonths"] },
              { key: "postfile_firstEmiDate", label: "1st EMI Date", paths: ["postfile_firstEmiDate"], format: "date" },
              { key: "postfile_maturityDate", label: "Maturity Date", paths: ["postfile_maturityDate"], format: "date" },
              { key: "postfile_emiAmount", label: "EMI Amount", paths: ["postfile_emiAmount"], format: "money" },
              { key: "postfile_processingFees", label: "Processing Fees", paths: ["postfile_processingFees"], format: "money" },
            ]}
            leftTone="amber"
            rightTone="emerald"
          />
        ),
        fields: [
          { key: "postfile_bankName", label: "Post-File Bank", paths: ["postfile_bankName"] },
          { key: "postfile_approvalDate", label: "Approval Date", paths: ["postfile_approvalDate"], format: "date" },
          { key: "postfile_loanAmountApproved", label: "Loan Amount Approved", paths: ["postfile_loanAmountApproved"], format: "money" },
          { key: "postfile_loanAmountDisbursed", label: "Loan Amount Disbursed", paths: ["postfile_loanAmountDisbursed"], format: "money" },
          { key: "postfile_disbursedLoanTotal", label: "Disbursed Loan Total", paths: ["postfile_disbursedLoanTotal"], format: "money" },
          { key: "postfile_disbursedLoan", label: "Disbursed Loan", paths: ["postfile_disbursedLoan"], format: "money" },
          { key: "postfile_disbursedCreditAssured", label: "Disbursed Credit Assured", paths: ["postfile_disbursedCreditAssured"], format: "money" },
          { key: "postfile_disbursedInsurance", label: "Disbursed Insurance", paths: ["postfile_disbursedInsurance"], format: "money" },
          { key: "postfile_disbursedEw", label: "Disbursed EW", paths: ["postfile_disbursedEw"], format: "money" },
          { key: "postfile_sameAsApproved", label: "Same as Approved", paths: ["postfile_sameAsApproved"], format: "yesno" },
          { key: "postfile_processingFees", label: "Processing Fees", paths: ["postfile_processingFees"], format: "money" },
          { key: "postfile_roiType", label: "ROI Type", paths: ["postfile_roiType"] },
          { key: "postfile_roi", label: "ROI", paths: ["postfile_roi"] },
          { key: "postfile_emiMode", label: "EMI Mode", paths: ["postfile_emiMode"] },
          { key: "postfile_emiPlan", label: "EMI Plan", paths: ["postfile_emiPlan"] },
          { key: "postfile_tenureMonths", label: "Tenure (Months)", paths: ["postfile_tenureMonths"] },
          { key: "postfile_firstEmiDate", label: "1st EMI Date", paths: ["postfile_firstEmiDate"], format: "date" },
          { key: "postfile_maturityDate", label: "Maturity Date", paths: ["postfile_maturityDate"], format: "date" },
          { key: "postfile_emiAmount", label: "EMI Amount", paths: ["postfile_emiAmount"], format: "money" },
        ],
      },
      {
        key: "po_vehicle",
        label: "Vehicle Verify",
        icon: "CarFront",
        render: (loanData) => (
          <SplitSectionFields
            data={loanData}
            leftTitle="Vehicle Verification"
            rightTitle="Showroom & Registration"
            leftFields={[
              { key: "vehicleMake", label: "Make", paths: ["vehicleMake"] },
              { key: "vehicleModel", label: "Model", paths: ["vehicleModel"] },
              { key: "vehicleVariant", label: "Variant", paths: ["vehicleVariant"] },
              { key: "vehicleFuelType", label: "Fuel Type", paths: ["vehicleFuelType"] },
              { key: "exShowroomPrice", label: "Ex-Showroom", paths: ["exShowroomPrice"], format: "money" },
              { key: "insuranceCost", label: "Insurance", paths: ["insuranceCost"], format: "money" },
              { key: "roadTax", label: "Road Tax", paths: ["roadTax"], format: "money" },
              { key: "accessoriesAmount", label: "Accessories", paths: ["accessoriesAmount"], format: "money" },
              { key: "dealerDiscount", label: "Dealer Discount", paths: ["dealerDiscount"], format: "money" },
              { key: "manufacturerDiscount", label: "Manufacturer Discount", paths: ["manufacturerDiscount"], format: "money" },
            ]}
            rightFields={[
              { key: "showroomDealerName", label: "Showroom Name", paths: ["showroomDealerName", "delivery_dealerName"] },
              { key: "showroomDealerContactPerson", label: "Showroom Contact Person", paths: ["showroomDealerContactPerson"] },
              { key: "showroomDealerContactNumber", label: "Showroom Contact Number", paths: ["showroomDealerContactNumber"] },
              { key: "showroomDealerAddress", label: "Showroom Address", paths: ["showroomDealerAddress", "delivery_dealerAddress"] },
              { key: "registerSameAsAadhaar", label: "Registered at Aadhaar/GST Address", paths: ["registerSameAsAadhaar"], format: "yesno" },
              { key: "registerSameAsPermanent", label: "Registered at Permanent Address", paths: ["registerSameAsPermanent"], format: "yesno", showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" },
              { key: "registrationAddress", label: "Registration Address", paths: ["registrationAddress"], showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
              { key: "registrationPincode", label: "Registration Pincode", paths: ["registrationPincode"], showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
              { key: "postfile_regd_city", label: "Registration City", paths: ["postfile_regd_city", "registrationCity"] },
            ]}
            leftTone="violet"
            rightTone="sky"
          />
        ),
        fields: [
          { key: "vehicleMake", label: "Make", paths: ["vehicleMake"] },
          { key: "vehicleModel", label: "Model", paths: ["vehicleModel"] },
          { key: "vehicleVariant", label: "Variant", paths: ["vehicleVariant"] },
          { key: "vehicleFuelType", label: "Fuel Type", paths: ["vehicleFuelType"] },
          { key: "showroomDealerName", label: "Showroom Name", paths: ["showroomDealerName", "delivery_dealerName"] },
          { key: "showroomDealerContactPerson", label: "Showroom Contact Person", paths: ["showroomDealerContactPerson"] },
          { key: "showroomDealerContactNumber", label: "Showroom Contact Number", paths: ["showroomDealerContactNumber"] },
          { key: "showroomDealerAddress", label: "Showroom Address", paths: ["showroomDealerAddress", "delivery_dealerAddress"] },
          { key: "exShowroomPrice", label: "Ex-Showroom", paths: ["exShowroomPrice"], format: "money" },
          { key: "insuranceCost", label: "Insurance", paths: ["insuranceCost"], format: "money" },
          { key: "roadTax", label: "Road Tax", paths: ["roadTax"], format: "money" },
          { key: "accessoriesAmount", label: "Accessories", paths: ["accessoriesAmount"], format: "money" },
          { key: "dealerDiscount", label: "Dealer Discount", paths: ["dealerDiscount"], format: "money" },
          { key: "manufacturerDiscount", label: "Manufacturer Discount", paths: ["manufacturerDiscount"], format: "money" },
          { key: "registerSameAsAadhaar", label: "Registered at Aadhaar/GST Address", paths: ["registerSameAsAadhaar"], format: "yesno" },
          { key: "registerSameAsPermanent", label: "Registered at Permanent Address", paths: ["registerSameAsPermanent"], format: "yesno", showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" },
          { key: "registrationAddress", label: "Registration Address", paths: ["registrationAddress"], showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
          { key: "registrationPincode", label: "Registration Pincode", paths: ["registrationPincode"], showWhen: (d) => String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" && String(d?.registerSameAsPermanent || "").toLowerCase() === "no" },
          { key: "postfile_regd_city", label: "Registration City", paths: ["postfile_regd_city", "registrationCity"] },
        ],
      },
      {
        key: "po_instruments",
        label: "Instruments",
        icon: "ReceiptText",
        render: (loanData) => {
          const mode = String(loanData?.instrumentType || "").trim().toUpperCase();
          const chequeRows = extractChequeRows(loanData);

          const modePill = (name, active) => (
            <span
              key={name}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                active
                  ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
                  : "border-border/80 bg-card text-muted-foreground"
              }`}
            >
              {name}
            </span>
          );

          const fieldBlock = (title, fields) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/25">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </div>
              <FieldGrid fields={fields} data={loanData} />
            </div>
          );

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {["CHEQUE", "ECS", "SI", "NACH"].map((name) => modePill(name, mode === name))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(mode === "SI" || (!mode && hasValue(loanData?.si_accountNumber))) &&
                  fieldBlock("SI Details", [
                    { key: "si_accountNumber", label: "SI Account Number", paths: ["si_accountNumber"] },
                    { key: "si_signedBy", label: "SI Signed By", paths: ["si_signedBy"] },
                    { key: "si_image", label: "SI Image", paths: ["si_image"] },
                  ])}

                {(mode === "NACH" || (!mode && hasValue(loanData?.nach_accountNumber))) &&
                  fieldBlock("NACH / E-Mandate", [
                    { key: "nach_accountNumber", label: "NACH Account Number", paths: ["nach_accountNumber"] },
                    { key: "nach_signedBy", label: "NACH Signed By", paths: ["nach_signedBy"] },
                    { key: "nach_image", label: "NACH Image", paths: ["nach_image"] },
                  ])}

                {(mode === "ECS" || (!mode && (hasValue(loanData?.ecs_accountNumber) || hasValue(loanData?.ecs_bankName)))) &&
                  fieldBlock("ECS Details", [
                    { key: "ecs_micrCode", label: "MICR Code", paths: ["ecs_micrCode"] },
                    { key: "ecs_bankName", label: "Bank Name", paths: ["ecs_bankName"] },
                    { key: "ecs_accountNumber", label: "Account Number", paths: ["ecs_accountNumber"] },
                    { key: "ecs_date", label: "Date", paths: ["ecs_date"], format: "date" },
                    { key: "ecs_amount", label: "Amount", paths: ["ecs_amount"], format: "money" },
                    { key: "ecs_tag", label: "Tag", paths: ["ecs_tag"] },
                    { key: "ecs_favouring", label: "Favouring", paths: ["ecs_favouring"] },
                    { key: "ecs_signedBy", label: "Signed By", paths: ["ecs_signedBy"] },
                    { key: "ecs_image", label: "Image", paths: ["ecs_image"] },
                  ])}
              </div>

              {(mode === "CHEQUE" || (!mode && chequeRows.length > 0)) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/25">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Cheque Details ({chequeRows.length})
                  </div>
                  {!chequeRows.length ? (
                    <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No cheque entries
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chequeRows.map((row) => (
                        <div key={row.id} className="rounded-lg border border-border/70 bg-card/80 p-2.5">
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Cheque {row.id}
                          </div>
                          <FieldGrid
                            data={{}}
                            fields={[
                              { key: `number_${row.id}`, label: "Number", getValue: () => row.number },
                              { key: `bank_${row.id}`, label: "Bank Name", getValue: () => row.bankName },
                              { key: `account_${row.id}`, label: "Account Number", getValue: () => row.accountNumber },
                              { key: `date_${row.id}`, label: "Date", getValue: () => row.date, format: "date" },
                              { key: `amount_${row.id}`, label: "Amount", getValue: () => row.amount, format: "money" },
                              { key: `tag_${row.id}`, label: "Tag", getValue: () => row.tag },
                              { key: `favouring_${row.id}`, label: "Favouring", getValue: () => row.favouring },
                              { key: `signed_${row.id}`, label: "Signed By", getValue: () => row.signedBy },
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "po_dispatch",
        label: "Dispatch/Docs",
        icon: "FolderOpen",
        render: (loanData) => (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/25">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Dispatch & Record
            </div>
            <FieldGrid
              data={loanData}
              fields={[
                { key: "dispatch_date", label: "Dispatch Date", paths: ["dispatch_date"], format: "date" },
                { key: "dispatch_time", label: "Dispatch Time", paths: ["dispatch_time"] },
                { key: "dispatch_through", label: "Dispatch Through", paths: ["dispatch_through"] },
                { key: "disbursement_date", label: "Disbursement Date", paths: ["disbursement_date"], format: "date" },
                { key: "disbursement_time", label: "Disbursement Time", paths: ["disbursement_time"] },
                { key: "loan_number", label: "Loan Number (Actual)", paths: ["loan_number", "loanId"] },
                { key: "docs_prepared_by", label: "Docs Prepared By", paths: ["docs_prepared_by", "docsPreparedBy"] },
              ]}
            />
          </div>
        ),
        fields: [
          { key: "dispatch_date", label: "Dispatch Date", paths: ["dispatch_date"], format: "date" },
          { key: "dispatch_time", label: "Dispatch Time", paths: ["dispatch_time"] },
          { key: "dispatch_through", label: "Dispatch Through", paths: ["dispatch_through"] },
          { key: "disbursement_date", label: "Disbursement Date", paths: ["disbursement_date"], format: "date" },
          { key: "disbursement_time", label: "Disbursement Time", paths: ["disbursement_time"] },
          { key: "loan_number", label: "Loan Number (Actual)", paths: ["loan_number", "loanId"] },
          { key: "docs_prepared_by", label: "Docs Prepared By", paths: ["docs_prepared_by", "docsPreparedBy"] },
        ],
      },
      {
        key: "po_repayment_intelligence",
        label: "Repayment Intelligence",
        icon: "Calculator",
        render: () => <RepaymentIntelligencePanel form={context.form} />,
        fields: [
          { key: "postfile_loanAmountApproved", label: "Approved Amount", paths: ["postfile_loanAmountApproved"], format: "money" },
          { key: "postfile_loanAmountDisbursed", label: "Disbursed Amount", paths: ["postfile_loanAmountDisbursed"], format: "money" },
          { key: "postfile_roi", label: "ROI", paths: ["postfile_roi"] },
          { key: "postfile_roiType", label: "ROI Type", paths: ["postfile_roiType"] },
          { key: "postfile_tenureMonths", label: "Tenure", paths: ["postfile_tenureMonths"] },
          { key: "postfile_emiAmount", label: "EMI", paths: ["postfile_emiAmount"], format: "money" },
          { key: "postfile_firstEmiDate", label: "1st EMI Date", paths: ["postfile_firstEmiDate"], format: "date" },
          { key: "postfile_maturityDate", label: "Maturity Date", paths: ["postfile_maturityDate"], format: "date" },
          { key: "postfile_currentOutstanding", label: "Current Outstanding", paths: ["postfile_currentOutstanding"], format: "money" },
          { key: "postfile_perDayInterest", label: "Per Day Interest", paths: ["postfile_perDayInterest"], format: "money" },
        ],
      },
    ];
  }

  return [
    {
      key: "dl_all",
      label: "Delivery Snapshot",
      icon: "Truck",
      render: (loanData) => (
        <SplitSectionFields
          data={loanData}
          leftTitle="Delivery + RC"
          rightTitle="Insurance + Invoice"
          leftFields={[
            { key: "delivery_date", label: "Delivery Date", paths: ["delivery_date"], format: "date" },
            { key: "delivery_dealerName", label: "Dealer Name", paths: ["delivery_dealerName", "showroomDealerName"] },
            { key: "delivery_dealerContactPerson", label: "Contact Person", paths: ["delivery_dealerContactPerson"] },
            { key: "delivery_dealerContactNumber", label: "Contact Number", paths: ["delivery_dealerContactNumber"] },
            { key: "delivery_dealerAddress", label: "Dealer Address", paths: ["delivery_dealerAddress", "showroomDealerAddress"] },
            { key: "delivery_by", label: "Delivery By", paths: ["delivery_by"] },
            { key: "rc_redg_no", label: "Regd No", paths: ["rc_redg_no", "vehicleRegNo"] },
            { key: "yearOfManufacture", label: "Year of Manufacture", paths: ["yearOfManufacture", "boughtInYear"] },
            { key: "rc_chassis_no", label: "Chassis No", paths: ["rc_chassis_no"] },
            { key: "rc_engine_no", label: "Engine No", paths: ["rc_engine_no"] },
            { key: "rc_redg_date", label: "Regd Date", paths: ["rc_redg_date"], format: "date" },
            { key: "hypothecation", label: "Hypothecation", paths: ["approval_bankName", "hypothecation"] },
            { key: "rc_received_as", label: "RC Received As", paths: ["rc_received_as"] },
            { key: "rc_received_from", label: "RC Received From", paths: ["rc_received_from"] },
            { key: "rc_received_date", label: "RC Received Date", paths: ["rc_received_date"], format: "date" },
            { key: "rc_inv_storage_number", label: "RC/INV Storage Number", paths: ["rc_inv_storage_number"] },
            { key: "delivery_rcFile", label: "RC File", paths: ["delivery_rcFile"] },
          ]}
          rightFields={[
            { key: "insurance_by", label: "Insurance By", paths: ["insurance_by"] },
            { key: "insurance_company_name", label: "Insurance Company", paths: ["insurance_company_name"] },
            { key: "insurance_policy_number", label: "Policy Number", paths: ["insurance_policy_number"] },
            { key: "insurance_policy_start_date", label: "Policy Start Date", paths: ["insurance_policy_start_date"], format: "date" },
            { key: "insurance_policy_duration_od", label: "Policy Duration (OD)", paths: ["insurance_policy_duration_od"] },
            { key: "insurance_policy_end_date_od", label: "Policy End Date (OD)", paths: ["insurance_policy_end_date_od"], format: "date" },
            { key: "invoice_number", label: "Invoice Number", paths: ["invoice_number"] },
            { key: "invoice_date", label: "Invoice Date", paths: ["invoice_date"], format: "date" },
            { key: "invoice_received_as", label: "Invoice Received As", paths: ["invoice_received_as"] },
            { key: "invoice_received_from", label: "Invoice Received From", paths: ["invoice_received_from"] },
            { key: "invoice_received_date", label: "Invoice Received Date", paths: ["invoice_received_date"], format: "date" },
            { key: "delivery_invoiceFile", label: "Invoice File", paths: ["delivery_invoiceFile"] },
          ]}
          leftTone="violet"
          rightTone="emerald"
        />
      ),
      fields: [
        { key: "delivery_date", label: "Delivery Date", paths: ["delivery_date"], format: "date" },
        { key: "delivery_dealerName", label: "Dealer Name", paths: ["delivery_dealerName", "showroomDealerName"] },
        { key: "delivery_dealerContactPerson", label: "Contact Person", paths: ["delivery_dealerContactPerson"] },
        { key: "delivery_dealerContactNumber", label: "Contact Number", paths: ["delivery_dealerContactNumber"] },
        { key: "delivery_dealerAddress", label: "Dealer Address", paths: ["delivery_dealerAddress", "showroomDealerAddress"] },
        { key: "delivery_by", label: "Delivery By", paths: ["delivery_by"] },
        { key: "insurance_by", label: "Insurance By", paths: ["insurance_by"] },
        { key: "insurance_company_name", label: "Insurance Company", paths: ["insurance_company_name"] },
        { key: "insurance_policy_number", label: "Policy Number", paths: ["insurance_policy_number"] },
        { key: "insurance_policy_start_date", label: "Policy Start Date", paths: ["insurance_policy_start_date"], format: "date" },
        { key: "insurance_policy_duration_od", label: "Policy Duration (OD)", paths: ["insurance_policy_duration_od"] },
        { key: "insurance_policy_end_date_od", label: "Policy End Date (OD)", paths: ["insurance_policy_end_date_od"], format: "date" },
        { key: "invoice_number", label: "Invoice Number", paths: ["invoice_number"] },
        { key: "invoice_date", label: "Invoice Date", paths: ["invoice_date"], format: "date" },
        { key: "invoice_received_as", label: "Invoice Received As", paths: ["invoice_received_as"] },
        { key: "invoice_received_from", label: "Invoice Received From", paths: ["invoice_received_from"] },
        { key: "invoice_received_date", label: "Invoice Received Date", paths: ["invoice_received_date"], format: "date" },
        { key: "delivery_invoiceFile", label: "Invoice File", paths: ["delivery_invoiceFile"] },
        { key: "rc_redg_no", label: "Regd No", paths: ["rc_redg_no", "vehicleRegNo"] },
        { key: "yearOfManufacture", label: "Year of Manufacture", paths: ["yearOfManufacture", "boughtInYear"] },
        { key: "rc_chassis_no", label: "Chassis No", paths: ["rc_chassis_no"] },
        { key: "rc_engine_no", label: "Engine No", paths: ["rc_engine_no"] },
        { key: "rc_redg_date", label: "Regd Date", paths: ["rc_redg_date"], format: "date" },
        { key: "rc_received_as", label: "RC Received As", paths: ["rc_received_as"] },
        { key: "rc_received_from", label: "RC Received From", paths: ["rc_received_from"] },
        { key: "rc_received_date", label: "RC Received Date", paths: ["rc_received_date"], format: "date" },
        { key: "hypothecation", label: "Hypothecation", paths: ["approval_bankName", "hypothecation"] },
        { key: "rc_inv_storage_number", label: "RC/INV Storage Number", paths: ["rc_inv_storage_number"] },
        { key: "delivery_rcFile", label: "RC File", paths: ["delivery_rcFile"] },
      ],
    },
  ];
};

const getStageTone = (stage) => {
  if (stage === "approval") return "emerald";
  if (stage === "postfile") return "amber";
  if (stage === "delivery") return "violet";
  return "sky";
};

const LoanViewModal = ({ open, loan, onClose, initialTab, onEdit }) => {
  const [form] = Form.useForm();
  const [fullLoan, setFullLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("prefile");
  const [activeSubTab, setActiveSubTab] = useState("pf_applicant");
  const [searchQuery, setSearchQuery] = useState("");
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const loanId = loan?._id || loan?.loanId;
  const data = useMemo(() => fullLoan || loan || {}, [fullLoan, loan]);
  const requestedInitialTab = String(initialTab || "").toLowerCase();
  const forceRepaymentTab = open && requestedInitialTab === "po_repayment_intelligence";

  useEffect(() => {
    if (!open || !loanId) {
      if (!open) {
        setFullLoan(null);
        setSearchQuery("");
        setDocumentsOpen(false);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    loansApi
      .getById(loanId)
      .then((res) => {
        if (cancelled) return;
        const body = res?.data ?? res;
        const fetched = body?.data ?? body;
        if (fetched) setFullLoan(fetched);
      })
      .catch(() => {
        if (!cancelled) setFullLoan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loanId]);

  useEffect(() => {
    if (!open) return;
    const stage = initialToStage[requestedInitialTab] || "prefile";
    setActiveStage(stage);
  }, [open, requestedInitialTab]);

  useEffect(() => {
    if (!open) return;
    if (requestedInitialTab === "po_repayment_intelligence") {
      setActiveSubTab("po_repayment_intelligence");
    }
  }, [open, requestedInitialTab]);

  useEffect(() => {
    if (!open || !data || typeof data !== "object") return;
    form.setFieldsValue(buildRepaymentViewerValues(data));
  }, [open, data, form]);

  useEffect(() => {
    if (!open || activeSubTab !== "po_repayment_intelligence") return;
    form.setFieldsValue(buildRepaymentViewerValues(data));
  }, [open, activeSubTab, data, form]);

  const tabContext = useMemo(
    () => ({
      form,
      loanId,
    }),
    [form, loanId],
  );

  const visibleStageKeys = useMemo(() => {
    if (isFinancedNoCase(data)) {
      return forceRepaymentTab
        ? ["prefile", "postfile", "delivery"]
        : ["prefile", "delivery"];
    }

    const keys = Object.keys(STAGE_META).filter((stageKey) => {
      const tabs = getStageSubTabs(stageKey, data, tabContext);
      return tabs.some((tab) => tabHasData(tab, data, tabContext));
    });

    if (forceRepaymentTab && !keys.includes("postfile")) {
      return [...keys, "postfile"];
    }
    return keys.length ? keys : ["prefile"];
  }, [data, tabContext, forceRepaymentTab]);

  useEffect(() => {
    if (!open) return;
    if (!visibleStageKeys.includes(activeStage)) {
      setActiveStage(visibleStageKeys[0]);
    }
  }, [open, visibleStageKeys, activeStage]);

  const stageSubTabsAll = useMemo(
    () => getStageSubTabs(activeStage, data, tabContext),
    [activeStage, data, tabContext],
  );

  const stageSubTabs = useMemo(
    () => {
      const filtered = stageSubTabsAll.filter((tab) =>
        tabHasData(tab, data, tabContext),
      );
      if (forceRepaymentTab && activeStage === "postfile") {
        const repaymentTab = stageSubTabsAll.find(
          (tab) => tab?.key === "po_repayment_intelligence",
        );
        if (
          repaymentTab &&
          !filtered.some((tab) => tab?.key === "po_repayment_intelligence")
        ) {
          return [...filtered, repaymentTab];
        }
      }
      return filtered;
    },
    [stageSubTabsAll, data, tabContext, forceRepaymentTab, activeStage],
  );

  useEffect(() => {
    if (!stageSubTabs.length) {
      setActiveSubTab("");
      return;
    }
    if (
      forceRepaymentTab &&
      activeStage === "postfile" &&
      stageSubTabs.some((tab) => tab.key === "po_repayment_intelligence")
    ) {
      if (activeSubTab !== "po_repayment_intelligence") {
        setActiveSubTab("po_repayment_intelligence");
      }
      return;
    }
    if (!stageSubTabs.some((tab) => tab.key === activeSubTab)) {
      setActiveSubTab(stageSubTabs[0].key);
    }
  }, [stageSubTabs, activeSubTab, forceRepaymentTab, activeStage]);

  const activeSubTabData = useMemo(
    () => stageSubTabs.find((tab) => tab.key === activeSubTab) || stageSubTabs[0],
    [stageSubTabs, activeSubTab],
  );

  const headerVehicle = useMemo(() => {
    const make = firstFilled(data?.vehicleMake, "");
    const model = firstFilled(data?.vehicleModel, "");
    const variant = firstFilled(data?.vehicleVariant, "");
    return [make, model, variant].filter((v) => String(v || "").trim()).join(" ");
  }, [data]);

  const sectionIndex = useMemo(() => {
    const entries = [];
    visibleStageKeys.forEach((stageKey) => {
      const tabs = getStageSubTabs(stageKey, data, tabContext).filter((tab) =>
        tabHasData(tab, data, tabContext),
      );
      tabs.forEach((sub) => {
        (sub.fields || [])
          .map((field) => resolveField(field, data))
          .filter((field) => field.visible && field.value !== "-")
          .forEach((field) => {
            entries.push({
              stage: stageKey,
              stageLabel: STAGE_META[stageKey].label,
              subtab: sub.key,
              subtabLabel: sub.label,
              label: field.label,
              value: field.value,
            });
          });

        if (sub.key === "po_instruments") {
          const cheques = extractChequeRows(data);
          cheques.forEach((row) => {
            entries.push({
              stage: stageKey,
              stageLabel: STAGE_META[stageKey].label,
              subtab: sub.key,
              subtabLabel: sub.label,
              label: `Cheque ${row.id}`,
              value: `${asText(row.number)} ${asText(row.bankName)} ${asText(row.accountNumber)} ${asMoney(row.amount)} ${asText(row.tag)}`,
            });
          });
        }
      });
    });

    const rawEntries = flattenSearchFields(data)
      .filter((item) => item.value !== "-")
      .filter((item) => visibleStageKeys.includes(item.stage))
      .map((item) => ({
        stage: item.stage,
        stageLabel: STAGE_META[item.stage]?.label || "Pre-File",
        subtab: null,
        subtabLabel: "Raw Fields",
        label: item.label,
        value: item.value,
      }));

    const deduped = new Map();
    [...entries, ...rawEntries].forEach((entry) => {
      const key = `${entry.stage}|${entry.subtab || "raw"}|${entry.label}|${entry.value}`;
      if (!deduped.has(key)) deduped.set(key, entry);
    });

    return Array.from(deduped.values());
  }, [data, tabContext, visibleStageKeys]);

  const query = searchQuery.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!query) return [];
    return sectionIndex.filter((entry) =>
      `${entry.label} ${entry.value} ${entry.stageLabel} ${entry.subtabLabel}`
        .toLowerCase()
        .includes(query),
    );
  }, [sectionIndex, query]);

  const groupedMatches = useMemo(() => {
    if (!searchMatches.length) return [];
    const map = new Map();

    searchMatches.forEach((entry) => {
      const stageKey = entry.stage;
      if (!map.has(stageKey)) {
        map.set(stageKey, {
          stage: stageKey,
          stageLabel: STAGE_META[stageKey]?.label || "Pre-File",
          subtabs: new Map(),
        });
      }

      const stageNode = map.get(stageKey);
      const subKey = entry.subtab || "raw";
      if (!stageNode.subtabs.has(subKey)) {
        stageNode.subtabs.set(subKey, {
          subtab: entry.subtab,
          subtabLabel: entry.subtabLabel || "Raw Fields",
          fields: [],
        });
      }
      stageNode.subtabs.get(subKey).fields.push(entry);
    });

    return Array.from(map.values()).map((stageNode) => ({
      ...stageNode,
      subtabs: Array.from(stageNode.subtabs.values()),
    }));
  }, [searchMatches]);

  const handleOpenMatch = (stage, subtab) => {
    setActiveStage(stage);
    if (subtab) setActiveSubTab(subtab);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="95vw"
      centered
      destroyOnClose
      className="theme-modal-clean"
      styles={{ body: { padding: 0, borderRadius: 20, overflow: "hidden" } }}
    >
      <div className="h-[88vh] overflow-hidden bg-background">
        <div className="border-b border-border bg-card px-4 py-3 md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Icon name="Eye" size={12} />
                Reader View
              </div>
              <h2 className="mt-1 truncate text-lg font-black text-foreground md:text-xl">
                {asText(data?.customerName)}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {asText(firstFilled(data?.loan_number, data?.loanId, data?._id))}
                {asText(data?.typeOfLoan) !== "-" ? ` • ${asText(data?.typeOfLoan)}` : ""}
                {headerVehicle ? ` • ${headerVehicle}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDocumentsOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <Icon name="FolderOpen" size={12} />
                Documents
              </button>
              {typeof onEdit === "function" && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-100 px-2.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                >
                  <Icon name="Pencil" size={12} />
                  Open Case
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
              >
                <Icon name="X" size={15} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-lg">
              <Icon
                name="Search"
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search across all viewer fields"
                className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {query
                ? `${searchMatches.length} result(s) across ${groupedMatches.length} stage(s)`
                : "Search and jump to any field instantly"}
            </div>
          </div>
        </div>

        <div className="h-[calc(88vh-150px)] overflow-y-auto px-3 py-3 md:px-4 md:py-4">
          <Form form={form} component={false}>
          <Form.Item name="postfile_loanAmountApproved" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_loanAmountDisbursed" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_roi" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_roiType" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_tenureMonths" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_firstEmiDate" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_emiAmount" hidden>
            <input />
          </Form.Item>
          <Form.Item name="postfile_maturityDate" hidden>
            <input />
          </Form.Item>
          <div className="mx-auto w-full max-w-[1600px] space-y-3">
            <div className="sticky top-0 z-20 rounded-2xl border border-border/70 bg-background p-2">
              <div className="flex flex-wrap gap-2">
                {visibleStageKeys.map((key) => {
                  const meta = STAGE_META[key];
                  return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStage(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      activeStage === key
                        ? meta.tone
                        : key === "prefile"
                          ? "border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100/80 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-200"
                          : key === "approval"
                            ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200"
                            : key === "postfile"
                              ? "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100/80 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200"
                              : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100/80 dark:border-violet-900/60 dark:bg-violet-950/25 dark:text-violet-200"
                    }`}
                  >
                    <Icon name={meta.icon} size={12} />
                    {meta.label}
                  </button>
                  );
                })}
              </div>

              {stageSubTabs.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/20 p-2">
                  {stageSubTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveSubTab(tab.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                        activeSubTab === tab.key
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      <Icon name={tab.icon} size={11} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {query ? (
              <StagePanel
                title="Search Results"
                icon="Search"
                tone="sky"
              >
                {!groupedMatches.length ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    No fields matched "{searchQuery}".
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {groupedMatches.map((group) => (
                      <div key={group.stage} className="rounded-xl border border-border/70 bg-background/75 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            {group.stageLabel}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenMatch(group.stage, null)}
                            className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                          >
                            Open Stage
                          </button>
                        </div>
                        <div className="space-y-2">
                          {group.subtabs.map((sub) => (
                            <div key={sub.subtab || "raw"} className="rounded-lg border border-border/70 bg-card/80 p-2.5">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="text-[11px] font-semibold text-foreground">
                                  {sub.subtabLabel}
                                </div>
                                {sub.subtab && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMatch(group.stage, sub.subtab)}
                                    className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  >
                                    Open
                                  </button>
                                )}
                              </div>
                              <FieldRowsBlock
                                rows={sub.fields.map((field, idx) => ({
                                  key: `${field.label}-${idx}`,
                                  label: field.label,
                                  value: field.value,
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </StagePanel>
            ) : null}

            {loading ? (
              <div className="flex h-[360px] items-center justify-center">
                <Spin />
              </div>
            ) : activeSubTabData ? (
              <StagePanel
                title={activeSubTabData.label}
                icon={activeSubTabData.icon}
                tone={getStageTone(activeStage)}
              >
                {typeof activeSubTabData.render === "function" ? (
                  activeSubTabData.render(data, tabContext)
                ) : (
                  <FieldGrid fields={activeSubTabData.fields || []} data={data} />
                )}
              </StagePanel>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No section available.
              </div>
            )}
          </div>
          </Form>
        </div>
      </div>
      <LoanDocumentsModal
        open={documentsOpen}
        loan={data}
        onClose={() => setDocumentsOpen(false)}
      />
    </Modal>
  );
};

export default LoanViewModal;
