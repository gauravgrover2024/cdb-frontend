import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";
import RepaymentIntelligencePanel from "../loan-form/post-file/RepaymentIntelligencePanel";
import LoanDocumentsModal from "./LoanDocumentsModal";
import BankStatusCard from "../loan-form/loan-approval/components/BankStatusCard";

// ─── Pure helpers (unchanged) ────────────────────────────────────────────────
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
  if (Array.isArray(v)) return v.some((e) => hasValue(e));
  if (typeof v === "object") return Object.values(v).some((e) => hasValue(e));
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
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
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
const prettifyFieldPath = (path = "") =>
  String(path || "")
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normalizeSearchText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim();
const tokenizeLoose = (value = "") =>
  prettifyFieldPath(String(value || ""))
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length > 1);
const normalizeLoose = (value = "") =>
  tokenizeLoose(value).join("");
const SEARCH_FIELD_BLACKLIST = new Set([
  "_id",
  "__v",
  "customerId",
  "createdAt",
  "updatedAt",
]);
const shouldIncludeSearchField = (path = "") => {
  const leaf = String(path || "")
    .split(".")
    .pop()
    ?.replace(/\[\d+\]/g, "");
  return Boolean(leaf) && !SEARCH_FIELD_BLACKLIST.has(leaf);
};
const uniqueTokens = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
const mergeLoanRecord = (payload, seed = null) => {
  const resolved = payload?.data ?? payload?.loan ?? payload?.record ?? payload;
  if (!resolved || typeof resolved !== "object" || Array.isArray(resolved)) {
    return seed && typeof seed === "object" ? seed : null;
  }
  return {
    ...(seed && typeof seed === "object" ? seed : {}),
    ...resolved,
  };
};
const inferStageByPath = (path) => {
  const p = String(path || "").toLowerCase();
  if (
    p.includes("approval_") ||
    p.includes("approval") ||
    p.includes("banksdata")
  )
    return "approval";
  if (
    p.includes("postfile_") ||
    p.includes("instrument") ||
    p.includes("dispatch") ||
    p.includes("disbursement") ||
    p.includes("maturity") ||
    p.includes("repayment") ||
    p.includes("loan_number")
  )
    return "postfile";
  if (
    p.includes("delivery_") ||
    p.includes("invoice") ||
    p.includes("insurance_") ||
    p.includes("rc_") ||
    p.includes("yearofmanufacture")
  )
    return "delivery";
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
      if (!key || val === "-" || !shouldIncludeSearchField(key)) return;
      const dedupe = `${key}::${val}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      out.push({
        label: prettifyFieldPath(key),
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
        (e) => e == null || typeof e !== "object" || dayjs.isDayjs(e),
      );
      if (allPrimitive) {
        const key = String(path || "").trim();
        const val = asText(value);
        if (!key || val === "-" || !shouldIncludeSearchField(key)) return;
        const dedupe = `${key}::${val}`;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        out.push({
          label: prettifyFieldPath(key),
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
    Object.entries(value).forEach(([k, v]) =>
      walk(v, path ? `${path}.${k}` : k),
    );
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
  const explicitCompanyApplicant =
    applicantType === "company" ||
    applicantType.includes("corporate") ||
    applicantType.includes("business") ||
    applicantType.includes("firm") ||
    applicantType.includes("llp") ||
    applicantType.includes("partnership") ||
    applicantType.includes("proprietor");

  if (explicitCompanyApplicant) return true;

  const explicitIndividualApplicant =
    applicantType === "individual" ||
    applicantType.includes("salaried") ||
    applicantType.includes("self employed") ||
    applicantType.includes("professional") ||
    applicantType.includes("person");

  if (explicitIndividualApplicant) return false;

  return (
    Boolean(String(data?.gstNumber || "").trim()) ||
    Boolean(String(data?.cinNumber || "").trim()) ||
    Boolean(String(data?.businessName || "").trim()) ||
    Boolean(String(data?.contactPersonName || "").trim())
  );
};
const normalizedLoanType = (data) =>
  String(firstFilled(data?.typeOfLoan, data?.loanType, ""))
    .trim()
    .toLowerCase();
const isYesLike = (v) => {
  if (v === true || v === 1) return true;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "y";
};
const rankBankStatus = (status) => {
  const s = String(status || "")
    .trim()
    .toLowerCase();
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
    const amountDiff =
      toNumber(b?.disbursedAmount || b?.loanAmount) -
      toNumber(a?.disbursedAmount || a?.loanAmount);
    if (amountDiff !== 0) return amountDiff;
    return toNumber(b?.tenure) - toNumber(a?.tenure);
  })[0];
};
const hasCoApplicantData = (data) => {
  if (data?.hasCoApplicant === true) return true;
  return Object.keys(data || {}).some(
    (key) => key.startsWith("co_") && hasValue(data[key]),
  );
};
const hasGuarantorData = (data) => {
  if (data?.hasGuarantor === true) return true;
  return Object.keys(data || {}).some(
    (key) => key.startsWith("gu_") && hasValue(data[key]),
  );
};
const hasSignatoryData = (data) =>
  Object.keys(data || {}).some(
    (key) => key.startsWith("signatory_") && hasValue(data[key]),
  );
const resolveField = (field, data) => {
  const raw =
    typeof field.getValue === "function"
      ? field.getValue(data)
      : firstFilled(...(field.paths || []).map((p) => getByPath(data, p)));
  const applicable =
    typeof field.showWhen === "function" ? field.showWhen(data) : true;
  const hideIfEmpty = field.hideIfEmpty !== false;
  const visible =
    applicable && (!hideIfEmpty || hasValue(raw) || field.alwaysShow === true);
  return { ...field, raw, value: formatByType(raw, field.format), visible };
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
      applicationId:
        bank?.applicationId ||
        String(loanData?.loanId || loanData?.loan_number || "-"),
      status: bank?.status || "Pending",
      statusHistory: Array.isArray(bank?.statusHistory)
        ? bank.statusHistory
        : [],
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
        interestRate:
          loanData?.approval_roi ?? loanData?.approval_interestRate ?? "",
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
    "postfile_maturity",
    "postfile_loanMaturityDate",
    "loanMaturityDate",
    "loan_maturity_date",
    "approval_maturityDate",
    "approval_maturity_date",
    "approval_loanMaturityDate",
    "approval_loan_maturity_date",
    "maturityDate",
    "maturity_date",
    "maturity",
  ]);
  setFallback("postfile_bankName", ["approval_bankName"]);
  if (primaryBank) {
    if (
      !hasValue(mapped.postfile_loanAmountApproved) &&
      hasValue(primaryBank.loanAmount)
    )
      mapped.postfile_loanAmountApproved = primaryBank.loanAmount;
    if (
      !hasValue(mapped.postfile_loanAmountDisbursed) &&
      hasValue(primaryBank.disbursedAmount)
    )
      mapped.postfile_loanAmountDisbursed = primaryBank.disbursedAmount;
    if (!hasValue(mapped.postfile_roi) && hasValue(primaryBank.interestRate))
      mapped.postfile_roi = primaryBank.interestRate;
    if (!hasValue(mapped.postfile_roi) && hasValue(primaryBank.roi))
      mapped.postfile_roi = primaryBank.roi;
    if (!hasValue(mapped.postfile_tenureMonths) && hasValue(primaryBank.tenure))
      mapped.postfile_tenureMonths = primaryBank.tenure;
    if (
      !hasValue(mapped.postfile_tenureMonths) &&
      hasValue(primaryBank.tenureMonths)
    )
      mapped.postfile_tenureMonths = primaryBank.tenureMonths;
    if (
      !hasValue(mapped.postfile_firstEmiDate) &&
      hasValue(primaryBank.firstEmiDate)
    )
      mapped.postfile_firstEmiDate = primaryBank.firstEmiDate;
    if (
      !hasValue(mapped.postfile_firstEmiDate) &&
      hasValue(primaryBank.firstEMIDate)
    )
      mapped.postfile_firstEmiDate = primaryBank.firstEMIDate;
    if (
      !hasValue(mapped.postfile_emiAmount) &&
      hasValue(primaryBank.emiAmount || primaryBank.emi)
    )
      mapped.postfile_emiAmount = firstFilled(
        primaryBank.emiAmount,
        primaryBank.emi,
      );
    if (!hasValue(mapped.postfile_bankName) && hasValue(primaryBank.bankName))
      mapped.postfile_bankName = primaryBank.bankName;
    if (!hasValue(mapped.postfile_maturityDate))
      mapped.postfile_maturityDate = firstFilled(
        primaryBank.maturityDate,
        primaryBank.maturity_date,
        primaryBank.loanMaturityDate,
        primaryBank.loan_maturity_date,
      );
  }
  if (!hasValue(mapped.postfile_maturityDate)) {
    const firstEmi = dayjs(mapped.postfile_firstEmiDate);
    const tenure = Number(mapped.postfile_tenureMonths);
    if (firstEmi.isValid() && Number.isFinite(tenure) && tenure > 0)
      mapped.postfile_maturityDate = firstEmi
        .add(Math.max(0, tenure - 1), "month")
        .format("YYYY-MM-DD");
  }
  return mapped;
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
    if (
      [
        row.number,
        row.bankName,
        row.accountNumber,
        row.date,
        row.amount,
        row.tag,
        row.favouring,
        row.signedBy,
      ].some((v) => hasValue(v))
    )
      rows.push(row);
  }
  return rows;
};
const collectTabFieldDefinitions = (tab = {}) => {
  const directFields = Array.isArray(tab?.fields) ? tab.fields : [];
  const sectionFields = (Array.isArray(tab?.sections) ? tab.sections : []).flatMap(
    (section) => (Array.isArray(section?.fields) ? section.fields : []),
  );
  return [...directFields, ...sectionFields];
};
const mergeCapturedAliasesIntoTabs = (tabs = [], stageEntries = []) => {
  if (!tabs.length || !stageEntries.length) return tabs;

  const clonedTabs = tabs.map((tab) => ({
    ...tab,
    fields: Array.isArray(tab.fields) ? [...tab.fields] : [],
    sections: Array.isArray(tab.sections)
      ? tab.sections.map((section) => ({
          ...section,
          fields: Array.isArray(section.fields) ? [...section.fields] : [],
        }))
      : [],
  }));

  const existingPaths = new Set();
  clonedTabs.forEach((tab) => {
    collectTabFieldDefinitions(tab).forEach((field) => {
      (field.paths || []).forEach((path) => existingPaths.add(path));
    });
  });

  const allFields = clonedTabs.flatMap((tab) => collectTabFieldDefinitions(tab));

  stageEntries.forEach((entry) => {
    if (!entry?.path || existingPaths.has(entry.path)) {
      return;
    }

    const entryLabelTokens = tokenizeLoose(entry.label);
    const entryPathLeaf = String(entry.path)
      .split(".")
      .pop()
      ?.replace(/\[\d+\]/g, "");
    const entryPathTokens = tokenizeLoose(entryPathLeaf);
    const normalizedEntryLabel = normalizeLoose(entry.label);
    const normalizedEntryPathLeaf = normalizeLoose(entryPathLeaf);

    const exactField = allFields.find((field) => {
      const normalizedFieldLabel = normalizeLoose(field.label);
      const normalizedFieldPathLeaves = (field.paths || []).map((path) =>
        normalizeLoose(String(path).split(".").pop()),
      );
      return (
        (normalizedFieldLabel &&
          normalizedEntryLabel &&
          normalizedFieldLabel === normalizedEntryLabel) ||
        (normalizedEntryPathLeaf &&
          normalizedFieldPathLeaves.includes(normalizedEntryPathLeaf))
      );
    });

    const existingField = exactField || allFields.find((field) => {
      const fieldLabelTokens = tokenizeLoose(field.label);
      const fieldPathTokens = uniqueTokens(
        (field.paths || []).flatMap((path) => tokenizeLoose(path.split(".").pop())),
      );
      const labelMatches =
        (entryLabelTokens.length &&
          fieldLabelTokens.length &&
          (entryLabelTokens.every((token) => fieldLabelTokens.includes(token)) ||
            fieldLabelTokens.every((token) => entryLabelTokens.includes(token)))) ||
        (normalizeLoose(field.label) &&
          normalizeLoose(entry.label) &&
          (normalizeLoose(field.label).includes(normalizeLoose(entry.label)) ||
            normalizeLoose(entry.label).includes(normalizeLoose(field.label))));
      const pathMatches =
        entryPathTokens.length &&
        (entryPathTokens.every((token) => fieldLabelTokens.includes(token)) ||
          entryPathTokens.every((token) => fieldPathTokens.includes(token)));
      return labelMatches || pathMatches;
    });

    if (existingField) {
      existingField.paths = uniqueTokens([...(existingField.paths || []), entry.path]);
      existingPaths.add(entry.path);
    }
  });

  return clonedTabs;
};
const tabHasData = (tab, loanData, context = {}) => {
  if (!tab) return false;
  if (tab.special === "all_fields") return (tab.allFields || []).length > 0;
  if (tab.key === "ap_status_cards")
    return getApprovalBanksForViewer(loanData, context.loanId).length > 0;
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
  const visibleFields = collectTabFieldDefinitions(tab)
    .map((f) => resolveField(f, loanData))
    .filter((f) => f.visible && f.value !== "-");
  return visibleFields.length > 0;
};

// ─── STAGE META ───────────────────────────────────────────────────────────────
const STAGE_META = {
  prefile: {
    label: "Pre-File",
    icon: "ClipboardList",
    color: "sky",
  },
  approval: {
    label: "Approval",
    icon: "BadgeCheck",
    color: "emerald",
  },
  postfile: {
    label: "Post-File",
    icon: "Files",
    color: "amber",
  },
  delivery: {
    label: "Delivery",
    icon: "Truck",
    color: "violet",
  },
};
const STAGE_ORDER = ["prefile", "approval", "postfile", "delivery"];
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

// ─── getStageSubTabs (all logic unchanged) ────────────────────────────────────
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
      {
        key: "applicantType",
        label: "Applicant Category",
        paths: ["applicantType", "customerType"],
      },
      {
        key: "dob",
        label: isCompany ? "Date of Incorporation" : "Date of Birth",
        paths: ["dob"],
        format: "date",
      },
      {
        key: "gender",
        label: "Gender",
        paths: ["gender"],
        showWhen: () => !isCompany,
      },
      {
        key: "maritalStatus",
        label: "Marital Status",
        paths: ["maritalStatus"],
        showWhen: () => !isCompany,
      },
      {
        key: "motherName",
        label: "Mother's Name",
        paths: ["motherName"],
        showWhen: () => !isCompany,
      },
      {
        key: "sdwOf",
        label: "Father / Husband Name",
        paths: ["sdwOf", "fatherName"],
        showWhen: () => !isCompany,
      },
      {
        key: "dependents",
        label: "Dependents",
        paths: ["dependents"],
        showWhen: () => !isCompany,
      },
      { key: "education", label: "Education", paths: ["education"] },
      {
        key: "houseType",
        label: "House",
        paths: ["houseType"],
        showWhen: () => !isCompany,
      },
      {
        key: "addressType",
        label: "Address Type",
        paths: ["addressType"],
        showWhen: () => !isCompany,
      },
      {
        key: "identityType",
        label: "Identity Proof",
        paths: ["identityProofType"],
        showWhen: () => !isCompany,
      },
      {
        key: "identityNo",
        label: "Identity Proof Number",
        paths: ["identityProofNumber"],
        showWhen: () => !isCompany,
      },
      {
        key: "addressProofType",
        label: "Address Proof Type",
        paths: ["addressProofType"],
        showWhen: () => !isCompany,
      },
      {
        key: "addressProofNumber",
        label: "Address Proof Number",
        paths: ["addressProofNumber"],
        showWhen: () => !isCompany,
      },
      {
        key: "primaryMobile",
        label: "Primary Mobile",
        paths: ["primaryMobile", "mobileNo", "customerMobile"],
      },
      { key: "extraMobiles", label: "Extra Mobiles", paths: ["extraMobiles"] },
      { key: "email", label: "Email", paths: ["email"] },
      {
        key: "contactPersonName",
        label: "Contact Person Name",
        paths: ["contactPersonName"],
        showWhen: () => isCompany,
      },
      {
        key: "contactPersonMobile",
        label: "Contact Person Mobile",
        paths: ["contactPersonMobile"],
        showWhen: () => isCompany,
      },
      { key: "panNumber", label: "PAN", paths: ["panNumber"] },
      {
        key: "aadhaarNumber",
        label: "Aadhaar",
        paths: ["aadhaarNumber", "aadharNumber"],
        showWhen: () => !isCompany,
      },
      {
        key: "gstNumber",
        label: "GST Number",
        paths: ["gstNumber"],
        showWhen: () => isCompany,
      },
    ];
    const occupationalFields = [
      { key: "occupationType", label: "Occupation", paths: ["occupationType"] },
      { key: "isMSME", label: "Is MSME", paths: ["isMSME"], format: "yesno" },
      {
        key: "professionalType",
        label: "Professional Type",
        paths: ["professionalType"],
      },
      { key: "companyType", label: "Company Type", paths: ["companyType"] },
      {
        key: "businessNature",
        label: "Business Nature",
        paths: ["businessNature"],
      },
      {
        key: "experienceCurrent",
        label: "Current Experience",
        paths: ["experienceCurrent", "currentExp"],
      },
      {
        key: "totalExperience",
        label: "Total Experience",
        paths: ["totalExperience", "totalExp"],
      },
      { key: "designation", label: "Designation", paths: ["designation"] },
      { key: "companyName", label: "Company Name", paths: ["companyName"] },
      {
        key: "employmentAddress",
        label: "Employment Address",
        paths: ["employmentAddress"],
      },
      {
        key: "employmentPincode",
        label: "Employment Pincode",
        paths: ["employmentPincode"],
      },
      {
        key: "employmentCity",
        label: "Employment City",
        paths: ["employmentCity"],
      },
      {
        key: "employmentPhone",
        label: "Employment Phone",
        paths: ["employmentPhone"],
      },
      {
        key: "officialEmail",
        label: "Official Email",
        paths: ["officialEmail"],
      },
    ];
    const incomeBankFields = [
      {
        key: "totalIncomeITR",
        label: "Total Income (ITR)",
        paths: ["totalIncomeITR"],
        format: "money",
      },
      {
        key: "monthlyIncome",
        label: "Monthly Income",
        paths: ["monthlyIncome"],
        format: "money",
      },
      {
        key: "salaryMonthly",
        label: "Monthly Salary",
        paths: ["salaryMonthly"],
        format: "money",
      },
      { key: "ifsc", label: "IFSC", paths: ["ifsc", "ifscCode"] },
      { key: "bankName", label: "Bank Name", paths: ["bankName"] },
      { key: "branch", label: "Branch / Address", paths: ["branch"] },
      {
        key: "accountNumber",
        label: "Applicant Account Number",
        paths: ["accountNumber"],
      },
      {
        key: "accountSinceYears",
        label: "Account Since (Years)",
        paths: ["accountSinceYears"],
      },
      { key: "openedIn", label: "Opened In", paths: ["openedIn"] },
      { key: "accountType", label: "Account Type", paths: ["accountType"] },
    ];
    const addressFields = [
      {
        key: "residenceAddress",
        label: "Present Address",
        paths: ["residenceAddress"],
      },
      { key: "pincode", label: "Present Pincode", paths: ["pincode"] },
      { key: "city", label: "Present City", paths: ["city"] },
      {
        key: "yearsInCurrentCity",
        label: "Years in Current City",
        paths: ["yearsInCurrentCity"],
      },
      {
        key: "yearsInCurrentHouse",
        label: "Years in Current Residence",
        paths: ["yearsInCurrentHouse"],
      },
      {
        key: "sameAsCurrentAddress",
        label: "Permanent Same as Current",
        paths: ["sameAsCurrentAddress"],
        format: "yesno",
      },
      {
        key: "permanentAddress",
        label: "Permanent Address",
        paths: ["permanentAddress"],
      },
      {
        key: "permanentPincode",
        label: "Permanent Pincode",
        paths: ["permanentPincode"],
      },
      {
        key: "permanentCity",
        label: "Permanent City",
        paths: ["permanentCity"],
      },
    ];
    const reference1Fields = [
      {
        key: "ref1Name",
        label: "Reference 1 Name",
        paths: ["reference1.name", "reference1_name"],
      },
      {
        key: "ref1Mobile",
        label: "Reference 1 Mobile",
        paths: ["reference1.mobile", "reference1_mobile"],
      },
      {
        key: "ref1Address",
        label: "Reference 1 Address",
        paths: ["reference1.address", "reference1_address"],
      },
      {
        key: "ref1Pincode",
        label: "Reference 1 Pincode",
        paths: ["reference1.pincode", "reference1_pincode"],
      },
      {
        key: "ref1City",
        label: "Reference 1 City",
        paths: ["reference1.city", "reference1_city"],
      },
      {
        key: "ref1Relation",
        label: "Reference 1 Relation",
        paths: ["reference1.relation", "reference1_relation"],
      },
    ];
    const reference2Fields = [
      {
        key: "ref2Name",
        label: "Reference 2 Name",
        paths: ["reference2.name", "reference2_name"],
      },
      {
        key: "ref2Mobile",
        label: "Reference 2 Mobile",
        paths: ["reference2.mobile", "reference2_mobile"],
      },
      {
        key: "ref2Address",
        label: "Reference 2 Address",
        paths: ["reference2.address", "reference2_address"],
      },
      {
        key: "ref2Pincode",
        label: "Reference 2 Pincode",
        paths: ["reference2.pincode", "reference2_pincode"],
      },
      {
        key: "ref2City",
        label: "Reference 2 City",
        paths: ["reference2.city", "reference2_city"],
      },
      {
        key: "ref2Relation",
        label: "Reference 2 Relation",
        paths: ["reference2.relation", "reference2_relation"],
      },
    ];
    const coPersonalFields = [
      { key: "co_name", label: "Name", paths: ["co_customerName", "co_name"] },
      { key: "co_mother", label: "Mother's Name", paths: ["co_motherName"] },
      { key: "co_father", label: "Father / Husband", paths: ["co_fatherName"] },
      { key: "co_dob", label: "DOB", paths: ["co_dob"], format: "date" },
      { key: "co_gender", label: "Gender", paths: ["co_gender"] },
      {
        key: "co_marital",
        label: "Marital Status",
        paths: ["co_maritalStatus"],
      },
      { key: "co_dependents", label: "Dependents", paths: ["co_dependents"] },
      { key: "co_education", label: "Education", paths: ["co_education"] },
      { key: "co_house", label: "House", paths: ["co_houseType"] },
      {
        key: "co_mobile",
        label: "Primary Mobile",
        paths: ["co_primaryMobile", "co_mobile"],
      },
      { key: "co_address", label: "Address", paths: ["co_address"] },
      { key: "co_pincode", label: "Pincode", paths: ["co_pincode"] },
      { key: "co_city", label: "City", paths: ["co_city"] },
      { key: "co_pan", label: "PAN", paths: ["co_pan"] },
      { key: "co_aadhaar", label: "Aadhaar", paths: ["co_aadhaar"] },
    ];
    const coOccupationalFields = [
      { key: "co_occupation", label: "Occupation", paths: ["co_occupation"] },
      {
        key: "co_professionalType",
        label: "Professional Type",
        paths: ["co_professionalType"],
      },
      {
        key: "co_companyType",
        label: "Company Type",
        paths: ["co_companyType"],
      },
      {
        key: "co_businessNature",
        label: "Business Nature",
        paths: ["co_businessNature"],
      },
      {
        key: "co_designation",
        label: "Designation",
        paths: ["co_designation"],
      },
      {
        key: "co_currentExperience",
        label: "Current Exp",
        paths: ["co_currentExperience"],
      },
      {
        key: "co_totalExperience",
        label: "Total Exp",
        paths: ["co_totalExperience"],
      },
      {
        key: "co_companyName",
        label: "Company Name",
        paths: ["co_companyName"],
      },
      {
        key: "co_companyAddress",
        label: "Company Address",
        paths: ["co_companyAddress"],
      },
      {
        key: "co_companyPincode",
        label: "Company Pincode",
        paths: ["co_companyPincode"],
      },
      {
        key: "co_companyCity",
        label: "Company City",
        paths: ["co_companyCity"],
      },
      {
        key: "co_companyPhone",
        label: "Company Phone",
        paths: ["co_companyPhone"],
      },
      {
        key: "signatorySame",
        label: "Authorised Signatory Same as Co-Applicant",
        paths: ["signatorySameAsCoApplicant"],
        format: "yesno",
      },
      {
        key: "sg_name",
        label: "Signatory Name",
        paths: ["signatory_customerName", "signatoryName"],
        showWhen: () => signatorySameAsCo,
      },
      {
        key: "sg_mobile",
        label: "Signatory Mobile",
        paths: ["signatory_primaryMobile", "signatoryMobile"],
        showWhen: () => signatorySameAsCo,
      },
      {
        key: "sg_designation",
        label: "Signatory Designation",
        paths: ["signatory_designation", "signatoryDesignation"],
        showWhen: () => signatorySameAsCo,
      },
    ];
    const signatoryFields = [
      {
        key: "signatorySame",
        label: "Same as Co-Applicant",
        paths: ["signatorySameAsCoApplicant"],
        format: "yesno",
      },
      {
        key: "sg_name",
        label: "Name",
        paths: ["signatory_customerName", "signatoryName"],
      },
      {
        key: "sg_mobile",
        label: "Primary Mobile",
        paths: ["signatory_primaryMobile", "signatoryMobile"],
      },
      {
        key: "sg_address",
        label: "Address",
        paths: ["signatory_address", "signatoryAddress"],
      },
      {
        key: "sg_pincode",
        label: "Pincode",
        paths: ["signatory_pincode", "signatoryPincode"],
      },
      {
        key: "sg_city",
        label: "City",
        paths: ["signatory_city", "signatoryCity"],
      },
      { key: "sg_dob", label: "DOB", paths: ["signatory_dob"], format: "date" },
      { key: "sg_gender", label: "Gender", paths: ["signatory_gender"] },
      {
        key: "sg_designation",
        label: "Designation",
        paths: ["signatory_designation", "signatoryDesignation"],
      },
      { key: "sg_pan", label: "PAN", paths: ["signatory_pan"] },
      { key: "sg_aadhaar", label: "Aadhaar", paths: ["signatory_aadhaar"] },
    ];
    const vehicleCoreFields = [
      {
        key: "typeOfLoan",
        label: "Type of Loan",
        paths: ["typeOfLoan", "loanType"],
      },
      { key: "usage", label: "Usage", paths: ["usage"] },
      {
        key: "purposeOfLoan",
        label: "Purpose of Loan",
        paths: ["purposeOfLoan"],
        showWhen: () => isCashIn || isRefinance,
      },
      { key: "vehicleMake", label: "Make", paths: ["vehicleMake"] },
      { key: "vehicleModel", label: "Model", paths: ["vehicleModel"] },
      { key: "vehicleVariant", label: "Variant", paths: ["vehicleVariant"] },
      {
        key: "vehicleFuelType",
        label: "Fuel Type",
        paths: ["vehicleFuelType"],
      },
      {
        key: "vehicleRegNo",
        label: "Vehicle Reg Number",
        paths: ["vehicleRegNo", "vehicleRegdNumber"],
        showWhen: () => !isNewCar,
      },
      {
        key: "valuation",
        label: "Valuation",
        paths: ["valuation"],
        format: "money",
        showWhen: () => !isNewCar,
      },
      {
        key: "boughtInYear",
        label: "Bought In (Year)",
        paths: ["boughtInYear"],
        showWhen: () => !isNewCar,
      },
      {
        key: "hypothecation",
        label: "Hypothecation",
        paths: ["hypothecation"],
        showWhen: () => !isNewCar,
      },
      {
        key: "hypothecationBank",
        label: "Hypothecation Bank",
        paths: ["hypothecationBank"],
        showWhen: (d) =>
          !isNewCar && String(d?.hypothecation || "").toLowerCase() === "yes",
      },
      {
        key: "registrationCity",
        label: "Registration City",
        paths: ["registrationCity"],
        showWhen: () => isNewCar || isUsedCar || isCashIn || isRefinance,
      },
    ];
    const vehiclePricingFields = [
      {
        key: "exShowroomPrice",
        label: "Ex-Showroom",
        paths: ["exShowroomPrice"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "insuranceCost",
        label: "Insurance Cost",
        paths: ["insuranceCost"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "roadTax",
        label: "Road Tax",
        paths: ["roadTax"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "accessoriesAmount",
        label: "Accessories",
        paths: ["accessoriesAmount"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "dealerDiscount",
        label: "Dealer Discount",
        paths: ["dealerDiscount"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "manufacturerDiscount",
        label: "Manufacturer Discount",
        paths: ["manufacturerDiscount"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "marginMoney",
        label: "Margin Money",
        paths: ["marginMoney"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "advanceEmi",
        label: "Advance EMI",
        paths: ["advanceEmi"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "tradeInValue",
        label: "Trade-in Value",
        paths: ["tradeInValue"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "otherDiscounts",
        label: "Other Discounts",
        paths: ["otherDiscounts"],
        format: "money",
        showWhen: () => isNewCar,
      },
      {
        key: "showroomDealerName",
        label: "Showroom / Dealer Name",
        paths: ["showroomDealerName", "delivery_dealerName"],
        showWhen: () => isNewCar,
      },
      {
        key: "showroomDealerContactPerson",
        label: "Showroom Contact Person",
        paths: ["showroomDealerContactPerson"],
        showWhen: () => isNewCar,
      },
      {
        key: "showroomDealerContactNumber",
        label: "Showroom Contact Number",
        paths: ["showroomDealerContactNumber"],
        showWhen: () => isNewCar,
      },
      {
        key: "showroomDealerAddress",
        label: "Showroom Address",
        paths: ["showroomDealerAddress", "delivery_dealerAddress"],
        showWhen: () => isNewCar,
      },
      {
        key: "registerSameAsAadhaar",
        label: isCompany
          ? "Registered at GST/Office Address"
          : "Registered at Aadhaar Address",
        paths: ["registerSameAsAadhaar"],
        format: "yesno",
        showWhen: () => isNewCar,
      },
      {
        key: "registerSameAsPermanent",
        label: "Registered at Permanent Address",
        paths: ["registerSameAsPermanent"],
        format: "yesno",
        showWhen: (d) =>
          isNewCar &&
          String(d?.registerSameAsAadhaar || "").toLowerCase() === "no",
      },
      {
        key: "registrationAddress",
        label: "Registration Address",
        paths: ["registrationAddress"],
        showWhen: (d) =>
          isNewCar &&
          String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" &&
          String(d?.registerSameAsPermanent || "").toLowerCase() === "no",
      },
      {
        key: "registrationPincode",
        label: "Registration Pincode",
        paths: ["registrationPincode"],
        showWhen: (d) =>
          isNewCar &&
          String(d?.registerSameAsAadhaar || "").toLowerCase() === "no" &&
          String(d?.registerSameAsPermanent || "").toLowerCase() === "no",
      },
    ];
    const recordFields = [
      {
        key: "leadDate",
        label: "Lead Date",
        paths: ["leadDate", "lead_date"],
        format: "date",
      },
      {
        key: "leadTime",
        label: "Lead Time",
        paths: ["leadTime", "lead_time"],
        format: "datetime",
      },
      {
        key: "leadSourceType",
        label: "Lead Source Type",
        paths: ["leadSourceType", "lead_source_type"],
      },
      {
        key: "receivingDate",
        label: "Receiving Date",
        paths: ["receivingDate"],
        format: "date",
      },
      {
        key: "receivingTime",
        label: "Receiving Time",
        paths: ["receivingTime"],
      },
      {
        key: "recordSource",
        label: "Source (Direct/Indirect)",
        paths: ["recordSource"],
      },
      { key: "sourceName", label: "Source Name", paths: ["sourceName"] },
      {
        key: "referenceName",
        label: "Reference Name",
        paths: ["referenceName"],
      },
      {
        key: "referenceNumber",
        label: "Reference Number",
        paths: ["referenceNumber"],
      },
      {
        key: "dealerMobile",
        label: "Dealer Mobile",
        paths: ["dealerMobile"],
        showWhen: (d) =>
          String(d?.recordSource || "").toLowerCase() === "indirect",
      },
      {
        key: "dealerAddress",
        label: "Dealer Address",
        paths: ["dealerAddress"],
        showWhen: (d) =>
          String(d?.recordSource || "").toLowerCase() === "indirect",
      },
      {
        key: "payoutApplicable",
        label: "Payout Applicable",
        paths: ["payoutApplicable"],
        format: "yesno",
        showWhen: (d) =>
          String(d?.recordSource || "").toLowerCase() === "indirect",
      },
      {
        key: "prefile_sourcePayoutPercentage",
        label: "Source Payout %",
        paths: ["prefile_sourcePayoutPercentage"],
        showWhen: (d) =>
          String(d?.recordSource || "").toLowerCase() === "indirect" &&
          String(d?.payoutApplicable || "").toLowerCase() === "yes",
      },
      { key: "dealtBy", label: "Dealt By", paths: ["dealtBy"] },
      {
        key: "docsPreparedBy",
        label: "Docs Prepared By",
        paths: ["docsPreparedBy"],
      },
    ];
    const guarantorFields = [
      { key: "gu_name", label: "Name", paths: ["gu_customerName", "gu_name"] },
      { key: "gu_dob", label: "DOB", paths: ["gu_dob"], format: "date" },
      { key: "gu_gender", label: "Gender", paths: ["gu_gender"] },
      {
        key: "gu_mobile",
        label: "Mobile",
        paths: ["gu_primaryMobile", "gu_mobile"],
      },
      { key: "gu_address", label: "Address", paths: ["gu_address"] },
      { key: "gu_pincode", label: "Pincode", paths: ["gu_pincode"] },
      { key: "gu_city", label: "City", paths: ["gu_city"] },
      { key: "gu_pan", label: "PAN", paths: ["gu_pan"] },
      { key: "gu_aadhaar", label: "Aadhaar", paths: ["gu_aadhaar"] },
      { key: "gu_occupation", label: "Occupation", paths: ["gu_occupation"] },
      {
        key: "gu_income",
        label: "Monthly Income",
        paths: ["gu_monthlyIncome"],
        format: "money",
      },
    ];

    const tabs = [
      {
        key: "pf_app_occ",
        label: "Applicant",
        icon: "UserRound",
        fields: [...applicantFields, ...occupationalFields],
        sections: [
          { title: "Personal Details", tone: "sky", fields: applicantFields },
          {
            title: "Occupational Details",
            tone: "emerald",
            fields: occupationalFields,
          },
        ],
      },
      {
        key: "pf_income_address",
        label: "Income & Address",
        icon: "Landmark",
        fields: [
          ...incomeBankFields,
          ...addressFields,
          ...reference1Fields,
          ...reference2Fields,
        ],
        sections: [
          {
            title: "Income & Banking",
            tone: "emerald",
            fields: incomeBankFields,
          },
          { title: "Address Details", tone: "violet", fields: addressFields },
          {
            title: "References",
            tone: "sky",
            fields: [...reference1Fields, ...reference2Fields],
          },
        ],
      },
      {
        key: "pf_vehicle",
        label: "Vehicle & Loan",
        icon: "Car",
        fields: [...vehicleCoreFields, ...vehiclePricingFields],
        sections: [
          { title: "Vehicle Details", tone: "sky", fields: vehicleCoreFields },
          {
            title: "Pricing & Dealer",
            tone: "amber",
            fields: vehiclePricingFields,
          },
        ],
      },
      {
        key: "pf_record",
        label: "Record Info",
        icon: "ClipboardList",
        fields: recordFields,
        sections: [
          { title: "Record & Source", tone: "violet", fields: recordFields },
        ],
      },
    ];

    if (hasCoApplicantData(data)) {
      tabs.push({
        key: "pf_coapplicant",
        label: "Co-Applicant",
        icon: "Users",
        fields: [...coPersonalFields, ...coOccupationalFields],
        sections: [
          {
            title: "Co-Applicant Personal",
            tone: "sky",
            fields: coPersonalFields,
          },
          {
            title: "Co-Applicant Occupational",
            tone: "emerald",
            fields: coOccupationalFields,
          },
        ],
      });
    }
    if (!signatorySameAsCo && hasSignatoryData(data)) {
      tabs.push({
        key: "pf_signatory",
        label: "Signatory",
        icon: "PenLine",
        fields: signatoryFields,
        sections: [
          {
            title: "Authorised Signatory",
            tone: "violet",
            fields: signatoryFields,
          },
        ],
      });
    }
    if (hasGuarantorData(data)) {
      tabs.push({
        key: "pf_guarantor",
        label: "Guarantor",
        icon: "ShieldCheck",
        fields: guarantorFields,
        sections: [
          {
            title: "Guarantor Details",
            tone: "amber",
            fields: guarantorFields,
          },
        ],
      });
    }
    return tabs;
  }

  if (stage === "approval") {
    const approvalBreakupFields = [
      {
        key: "ap_netLoanApproved",
        label: "Net Loan Approved",
        paths: ["approval_breakup_netLoanApproved"],
        format: "money",
      },
      {
        key: "ap_advanceEmi",
        label: "Advance EMI Deducted",
        paths: ["approval_breakup_advanceEmiDeducted"],
        format: "money",
      },
      {
        key: "ap_processingFee",
        label: "Processing Fee Deducted",
        paths: ["approval_breakup_processingFeeDeducted"],
        format: "money",
      },
      {
        key: "ap_insurancePremium",
        label: "Insurance Premium Deducted",
        paths: ["approval_breakup_insurancePremiumDeducted"],
        format: "money",
      },
      {
        key: "ap_otherDeductions",
        label: "Other Deductions",
        paths: ["approval_breakup_otherDeductions"],
        format: "money",
      },
      {
        key: "ap_chequeAmount",
        label: "Cheque / Transfer Amount",
        paths: ["approval_breakup_chequeAmount"],
        format: "money",
      },
    ];
    const approvalMainFields = [
      { key: "ap_bankName", label: "Bank Name", paths: ["approval_bankName"] },
      {
        key: "ap_applicationId",
        label: "Application ID",
        paths: ["approval_applicationId"],
      },
      {
        key: "ap_status",
        label: "Status",
        paths: ["approval_status", "status"],
      },
      {
        key: "ap_loanAmountApproved",
        label: "Loan Amount Approved",
        paths: ["approval_loanAmountApproved"],
        format: "money",
      },
      {
        key: "ap_loanAmountDisbursed",
        label: "Loan Amount Disbursed",
        paths: ["approval_loanAmountDisbursed"],
        format: "money",
      },
      {
        key: "ap_roi",
        label: "Rate of Interest",
        paths: ["approval_roi", "approval_interestRate"],
      },
      { key: "ap_roiType", label: "ROI Type", paths: ["approval_roiType"] },
      {
        key: "ap_tenure",
        label: "Tenure (Months)",
        paths: ["approval_tenureMonths"],
      },
      {
        key: "ap_processingFees",
        label: "Processing Fees",
        paths: ["approval_processingFees"],
        format: "money",
      },
      {
        key: "ap_firstEmiDate",
        label: "First EMI Date",
        paths: ["approval_firstEmiDate", "approval_firstEMIDate"],
        format: "date",
      },
      {
        key: "ap_maturityDate",
        label: "Maturity Date",
        paths: ["approval_maturityDate"],
        format: "date",
      },
      {
        key: "ap_emiAmount",
        label: "EMI Amount",
        paths: ["approval_emiAmount", "approval_emi"],
        format: "money",
      },
      {
        key: "ap_sanctionDate",
        label: "Sanction Date",
        paths: ["approval_sanctionDate"],
        format: "date",
      },
      {
        key: "ap_disbursementDate",
        label: "Disbursement Date",
        paths: ["approval_disbursementDate"],
        format: "date",
      },
      { key: "ap_remarks", label: "Remarks", paths: ["approval_remarks"] },
    ];
    return [
      {
        key: "ap_status_cards",
        label: "Bank Status",
        icon: "Building2",
        fields: approvalMainFields,
        special: "banks",
      },
      {
        key: "ap_breakup",
        label: "Loan Breakup",
        icon: "Calculator",
        fields: approvalBreakupFields,
        sections: [
          {
            title: "Disbursement Breakup",
            tone: "emerald",
            fields: approvalBreakupFields,
          },
        ],
      },
    ];
  }

  if (stage === "postfile") {
    const approvalReconciliationFields = [
      {
        key: "po_approvalDate",
        label: "Approval Date",
        paths: ["postfile_approvalDate"],
        format: "date",
      },
      {
        key: "po_bankName",
        label: "Bank Name",
        paths: ["postfile_bankName", "approval_bankName"],
      },
      {
        key: "po_loanNumber",
        label: "Loan / Account Number",
        paths: ["postfile_loanNumber", "loan_number"],
      },
      {
        key: "po_loanAmountApproved",
        label: "Loan Amount Approved",
        paths: ["postfile_loanAmountApproved"],
        format: "money",
      },
      {
        key: "po_disbursedLoanTotal",
        label: "Disbursed Loan Total",
        paths: ["postfile_disbursedLoanTotal", "postfile_loanAmountDisbursed"],
        format: "money",
      },
      {
        key: "po_loanAmountDisbursed",
        label: "Loan Amount Disbursed",
        paths: ["postfile_loanAmountDisbursed", "postfile_disbursedLoan"],
        format: "money",
      },
      {
        key: "po_roi",
        label: "Rate of Interest",
        paths: ["postfile_roi", "postfile_interestRate"],
      },
      { key: "po_roiType", label: "ROI Type", paths: ["postfile_roiType"] },
      {
        key: "po_tenureMonths",
        label: "Tenure (Months)",
        paths: ["postfile_tenureMonths"],
      },
      {
        key: "po_firstEmiDate",
        label: "First EMI Date",
        paths: ["postfile_firstEmiDate"],
        format: "date",
      },
      {
        key: "po_emiAmount",
        label: "EMI Amount",
        paths: ["postfile_emiAmount"],
        format: "money",
      },
      {
        key: "po_sameAsApproved",
        label: "Disbursal Same as Approved",
        paths: ["postfile_sameAsApproved"],
        format: "yesno",
      },
      {
        key: "po_processingFees",
        label: "Processing Fees",
        paths: ["postfile_processingFees"],
        format: "money",
      },
      {
        key: "po_emiMode",
        label: "EMI Mode",
        paths: ["postfile_emiMode"],
      },
      {
        key: "po_emiPlan",
        label: "EMI Plan",
        paths: ["postfile_emiPlan"],
      },
      {
        key: "po_maturityDate",
        label: "Maturity Date",
        paths: ["postfile_maturityDate"],
        format: "date",
      },
      {
        key: "po_disbursedLoanComponent",
        label: "Net Loan Component",
        paths: ["postfile_disbursedLoan"],
        format: "money",
      },
      {
        key: "po_disbursedCreditAssured",
        label: "Credit Assured Component",
        paths: ["postfile_disbursedCreditAssured"],
        format: "money",
      },
      {
        key: "po_disbursedInsurance",
        label: "Insurance Component",
        paths: ["postfile_disbursedInsurance"],
        format: "money",
      },
      {
        key: "po_disbursedEw",
        label: "Extended Warranty Component",
        paths: ["postfile_disbursedEw"],
        format: "money",
      },
    ];
    const vehicleVerificationFields = [
      { key: "po_vehicleMake", label: "Make", paths: ["vehicleMake"] },
      { key: "po_vehicleModel", label: "Model", paths: ["vehicleModel"] },
      { key: "po_vehicleVariant", label: "Variant", paths: ["vehicleVariant"] },
      { key: "po_vehicleFuelType", label: "Fuel Type", paths: ["vehicleFuelType"] },
      {
        key: "po_showroomDealerName",
        label: "Dealer Name",
        paths: ["showroomDealerName"],
      },
      {
        key: "po_showroomDealerContactPerson",
        label: "Contact Person",
        paths: ["showroomDealerContactPerson"],
      },
      {
        key: "po_showroomDealerContactNumber",
        label: "Contact Number",
        paths: ["showroomDealerContactNumber"],
      },
      {
        key: "po_showroomDealerAddress",
        label: "Dealer Address",
        paths: ["showroomDealerAddress"],
      },
      {
        key: "po_exShowroomPrice",
        label: "Ex-showroom Price",
        paths: ["exShowroomPrice"],
        format: "money",
      },
      {
        key: "po_insuranceCost",
        label: "Insurance Cost",
        paths: ["insuranceCost"],
        format: "money",
      },
      {
        key: "po_roadTax",
        label: "Road Tax",
        paths: ["roadTax"],
        format: "money",
      },
      {
        key: "po_accessoriesAmount",
        label: "Accessories Amount",
        paths: ["accessoriesAmount"],
        format: "money",
      },
      {
        key: "po_dealerDiscount",
        label: "Dealer Discount",
        paths: ["dealerDiscount"],
        format: "money",
      },
      {
        key: "po_manufacturerDiscount",
        label: "Manufacturer Discount",
        paths: ["manufacturerDiscount"],
        format: "money",
      },
      {
        key: "po_registerSameAsAadhaar",
        label: "Registered at Aadhaar / Office Address",
        paths: ["registerSameAsAadhaar", "registerSameAsAadhar"],
        format: "yesno",
      },
      {
        key: "po_registerSameAsPermanent",
        label: "Registered at Permanent Address",
        paths: ["registerSameAsPermanent"],
        format: "yesno",
      },
      {
        key: "po_registrationAddress",
        label: "Registration Address",
        paths: ["registrationAddress"],
      },
      {
        key: "po_registrationPincode",
        label: "Registration Pincode",
        paths: ["registrationPincode"],
      },
      {
        key: "po_registrationCity",
        label: "Registration City",
        paths: ["registrationCity", "postfile_regd_city"],
      },
    ];
    const dispatchRecordFields = [
      {
        key: "po_disbursementDate",
        label: "Disbursement Date",
        paths: ["disbursement_date", "postfile_disbursementDate"],
        format: "date",
      },
      {
        key: "po_disbursementTime",
        label: "Disbursement Time",
        paths: ["disbursement_time"],
      },
      {
        key: "po_dispatchDate",
        label: "Dispatch Date",
        paths: ["dispatch_date", "postfile_dispatchDate"],
        format: "date",
      },
      {
        key: "po_dispatchTime",
        label: "Dispatch Time",
        paths: ["dispatch_time"],
      },
      {
        key: "po_dispatchThrough",
        label: "Dispatch Through",
        paths: ["dispatch_through"],
      },
      {
        key: "po_loanNumberRecord",
        label: "Loan Number",
        paths: ["loan_number", "postfile_loanNumber"],
      },
      {
        key: "po_docsPreparedBy",
        label: "Docs Prepared By",
        paths: ["docs_prepared_by"],
      },
    ];
    const payoutFields = [
      {
        key: "po_payoutApplicable",
        label: "Payout Applicable",
        paths: ["payoutApplicable"],
        format: "yesno",
      },
      {
        key: "po_payoutBank",
        label: "Payout Bank",
        paths: ["postfile_payoutBank"],
      },
      {
        key: "po_payoutAmount",
        label: "Payout Amount",
        paths: ["postfile_payoutAmount"],
        format: "money",
      },
      {
        key: "po_payoutDate",
        label: "Payout Date",
        paths: ["postfile_payoutDate"],
        format: "date",
      },
      {
        key: "po_payoutPercentage",
        label: "Payout %",
        paths: ["postfile_payoutPercentage"],
      },
      {
        key: "po_payoutUtr",
        label: "Payout UTR",
        paths: ["postfile_payoutUtr"],
      },
      {
        key: "po_payoutRemarks",
        label: "Payout Remarks",
        paths: ["postfile_payoutRemarks"],
      },
    ];
    const instrumentFields = [
      {
        key: "instrumentType",
        label: "Instrument Type",
        paths: ["instrumentType"],
      },
      {
        key: "si_accountNumber",
        label: "SI Account Number",
        paths: ["si_accountNumber"],
      },
      {
        key: "si_signedBy",
        label: "SI Signed By",
        paths: ["si_signedBy"],
      },
      {
        key: "si_image",
        label: "SI Image",
        paths: ["si_image"],
      },
      { key: "si_bankName", label: "SI Bank Name", paths: ["si_bankName"] },
      {
        key: "nach_accountNumber",
        label: "NACH Account Number",
        paths: ["nach_accountNumber"],
      },
      {
        key: "nach_signedBy",
        label: "NACH Signed By",
        paths: ["nach_signedBy"],
      },
      {
        key: "nach_image",
        label: "NACH Image",
        paths: ["nach_image"],
      },
      {
        key: "nach_bankName",
        label: "NACH Bank Name",
        paths: ["nach_bankName"],
      },
      {
        key: "ecs_micrCode",
        label: "ECS MICR Code",
        paths: ["ecs_micrCode"],
      },
      {
        key: "ecs_accountNumber",
        label: "ECS Account Number",
        paths: ["ecs_accountNumber"],
      },
      { key: "ecs_bankName", label: "ECS Bank Name", paths: ["ecs_bankName"] },
      {
        key: "ecs_date",
        label: "ECS Date",
        paths: ["ecs_date"],
        format: "date",
      },
      {
        key: "ecs_amount",
        label: "ECS Amount",
        paths: ["ecs_amount"],
        format: "money",
      },
      { key: "ecs_tag", label: "ECS Tag", paths: ["ecs_tag"] },
      {
        key: "ecs_favouring",
        label: "ECS Favouring",
        paths: ["ecs_favouring"],
      },
      {
        key: "ecs_signedBy",
        label: "ECS Signed By",
        paths: ["ecs_signedBy"],
      },
      { key: "ecs_image", label: "ECS Image", paths: ["ecs_image"] },
    ];
    return [
      {
        key: "po_approval_reconciliation",
        label: "Approval Reconciliation",
        icon: "Banknote",
        fields: approvalReconciliationFields,
        sections: [
          {
            title: "Approval Reconciliation",
            tone: "amber",
            fields: approvalReconciliationFields,
          },
        ],
      },
      {
        key: "po_vehicle_verification",
        label: "Vehicle Verification",
        icon: "CarFront",
        fields: vehicleVerificationFields,
        sections: [
          {
            title: "Vehicle Verification",
            tone: "sky",
            fields: vehicleVerificationFields,
          },
        ],
      },
      {
        key: "po_instruments",
        label: "Instruments",
        icon: "CreditCard",
        fields: instrumentFields,
        special: "cheques",
        instrumentFields,
      },
      {
        key: "po_repayment_intelligence",
        label: "Repayment",
        icon: "TrendingUp",
        fields: [],
        special: "repayment",
      },
      {
        key: "po_dispatch_records",
        label: "Dispatch & Records",
        icon: "Send",
        fields: dispatchRecordFields,
        sections: [
          {
            title: "Dispatch & Record Details",
            tone: "violet",
            fields: dispatchRecordFields,
          },
        ],
      },
      {
        key: "po_payout",
        label: "Payout",
        icon: "Wallet",
        fields: payoutFields,
        sections: [
          { title: "Payout Details", tone: "emerald", fields: payoutFields },
        ],
      },
    ];
  }

  if (stage === "delivery") {
    const deliveryFields = [
      {
        key: "de_deliveryDate",
        label: "Delivery Date",
        paths: ["delivery_date"],
        format: "date",
      },
      {
        key: "de_dealerName",
        label: "Dealer Name",
        paths: ["delivery_dealerName"],
      },
      {
        key: "de_dealerContactPerson",
        label: "Contact Person",
        paths: ["delivery_dealerContactPerson"],
      },
      {
        key: "de_dealerContactNumber",
        label: "Contact Number",
        paths: ["delivery_dealerContactNumber"],
      },
      {
        key: "de_dealerAddress",
        label: "Dealer Address",
        paths: ["delivery_dealerAddress"],
      },
      {
        key: "de_deliveryBy",
        label: "Delivery By",
        paths: ["delivery_by"],
      },
    ];
    const invoiceFields = [
      {
        key: "de_invoiceNumber",
        label: "Invoice Number",
        paths: ["invoice_number"],
      },
      {
        key: "de_invoiceDate",
        label: "Invoice Date",
        paths: ["invoice_date"],
        format: "date",
      },
      {
        key: "de_invoiceReceivedAs",
        label: "Invoice Received As",
        paths: ["invoice_received_as"],
      },
      {
        key: "de_invoiceReceivedFrom",
        label: "Invoice Received From",
        paths: ["invoice_received_from"],
      },
      {
        key: "de_invoiceReceivedDate",
        label: "Invoice Received Date",
        paths: ["invoice_received_date"],
        format: "date",
      },
      {
        key: "de_invoiceFile",
        label: "Invoice File",
        paths: ["delivery_invoiceFile"],
      },
      {
        key: "de_rcInvStorageNumber",
        label: "RC / Invoice Storage Number",
        paths: ["rc_inv_storage_number"],
      },
    ];
    const rcFields = [
      {
        key: "de_rcRegNumber",
        label: "Registration Number",
        paths: ["rc_redg_no"],
      },
      {
        key: "de_yearOfManufacture",
        label: "Year of Manufacture",
        paths: ["yearOfManufacture"],
      },
      {
        key: "de_rcChassisNumber",
        label: "Chassis Number",
        paths: ["rc_chassis_no"],
      },
      {
        key: "de_rcEngineNumber",
        label: "Engine Number",
        paths: ["rc_engine_no"],
      },
      {
        key: "de_rcRegDate",
        label: "Registration Date",
        paths: ["rc_redg_date"],
        format: "date",
      },
      {
        key: "de_rcReceivedAs",
        label: "RC Received As",
        paths: ["rc_received_as"],
      },
      {
        key: "de_rcReceivedFrom",
        label: "RC Received From",
        paths: ["rc_received_from"],
      },
      {
        key: "de_rcReceivedDate",
        label: "RC Received Date",
        paths: ["rc_received_date"],
        format: "date",
      },
      {
        key: "de_rcFile",
        label: "RC File",
        paths: ["delivery_rcFile"],
      },
    ];
    const insuranceFields = [
      {
        key: "de_insuranceBy",
        label: "Insurance By",
        paths: ["insurance_by"],
      },
      {
        key: "insurance_company",
        label: "Insurance Company",
        paths: ["insurance_company_name"],
      },
      {
        key: "insurance_policyNumber",
        label: "Policy Number",
        paths: ["insurance_policy_number"],
      },
      {
        key: "insurance_from",
        label: "Policy Start Date",
        paths: ["insurance_policy_start_date"],
        format: "date",
      },
      {
        key: "insurance_to",
        label: "Policy End Date",
        paths: ["insurance_policy_end_date_od"],
        format: "date",
      },
      {
        key: "insurance_amount",
        label: "Insurance Premium",
        paths: ["insurance_premium"],
        format: "money",
      },
      {
        key: "insurance_type",
        label: "Policy Duration",
        paths: ["insurance_policy_duration_od"],
      },
    ];
    return [
      {
        key: "de_delivery",
        label: "Delivery Details",
        icon: "Truck",
        fields: deliveryFields,
        sections: [
          { title: "Vehicle Delivery", tone: "violet", fields: deliveryFields },
        ],
      },
      {
        key: "de_invoice",
        label: "Invoice",
        icon: "FileText",
        fields: invoiceFields,
        sections: [
          { title: "Invoice Details", tone: "amber", fields: invoiceFields },
        ],
      },
      {
        key: "de_rc",
        label: "RC Details",
        icon: "FileText",
        fields: rcFields,
        sections: [
          { title: "Registration Certificate", tone: "sky", fields: rcFields },
        ],
      },
      {
        key: "de_insurance",
        label: "Insurance",
        icon: "ShieldCheck",
        fields: insuranceFields,
        sections: [
          {
            title: "Insurance Details",
            tone: "emerald",
            fields: insuranceFields,
          },
        ],
      },
    ];
  }
  return [];
};

// ─── NEW UI PRIMITIVES ────────────────────────────────────────────────────────

const toneStyles = {
  sky: {
    card: "border-sky-200/60 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
    head: "text-sky-600 dark:text-sky-400",
  },
  emerald: {
    card: "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    head: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    card: "border-amber-200/60 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20",
    head: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    card: "border-violet-200/60 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20",
    head: "text-violet-600 dark:text-violet-400",
  },
};

const FieldRow = ({ label, value }) => (
  <div className="flex flex-col gap-1.5 border-b border-border/40 py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
    <span className="max-w-full text-[11px] font-medium leading-relaxed text-muted-foreground sm:max-w-[48%] sm:flex-shrink-0">
      {label}
    </span>
    <span className="max-w-full break-words text-left text-xs font-semibold text-foreground sm:max-w-[52%] sm:text-right">
      {value}
    </span>
  </div>
);

const SectionCard = ({ title, tone = "sky", fields, data, highlightKey = "" }) => {
  const visibleFields = useMemo(
    () => fields.map((f) => resolveField(f, data)).filter((f) => f.visible),
    [fields, data],
  );
  if (!visibleFields.length) return null;
  const ts = toneStyles[tone] || toneStyles.sky;
  return (
    <div className={`rounded-xl border p-3 ${ts.card}`}>
      <p
        className={`mb-2.5 text-[10px] font-bold uppercase tracking-widest ${ts.head}`}
      >
        {title}
      </p>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {visibleFields.map((f) => {
          const isHighlighted = Boolean(highlightKey) &&
            [f.key, ...(Array.isArray(f.paths) ? f.paths : [])].includes(highlightKey);
          return (
            <div
              key={f.key}
              className={
                isHighlighted
                  ? "rounded-lg bg-amber-100/70 px-2 dark:bg-amber-900/30"
                  : ""
              }
            >
              <FieldRow label={f.label} value={f.value} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmptyTab = ({ text = "No data available for this section" }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
    <Icon name="Inbox" size={28} className="opacity-30" />
    <p className="text-sm">{text}</p>
  </div>
);

const InlineEmptyState = ({ text = "No captured data found in this page yet." }) => (
  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/[0.16] px-4 py-6 text-center">
    <p className="text-xs font-medium text-muted-foreground">{text}</p>
  </div>
);

const SearchResultRow = ({ item, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(item)}
    className="w-full rounded-xl border border-transparent bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/35"
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <Icon name="Search" size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{item.label}</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.stageLabel}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {item.tabLabel}
          {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-foreground/90">
          {item.value}
        </p>
      </div>
      <Icon name="ArrowUpRight" size={14} className="mt-1 text-muted-foreground" />
    </div>
  </button>
);

const AllFieldsPanel = ({ fields = [], highlightKey = "" }) => {
  if (!fields.length) return <EmptyTab text="No captured fields found for this stage." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Captured Fields
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Raw case payload indexed for complete field coverage
          </p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {fields.length} fields
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {fields.map((field) => {
          const isHighlighted = Boolean(highlightKey) &&
            [field.path, field.highlightKey].includes(highlightKey);
          return (
            <div
              key={`${field.stage}-${field.path}`}
              className={
                isHighlighted
                  ? "bg-amber-100/60 dark:bg-amber-900/20"
                  : "bg-transparent"
              }
            >
              <div className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)] md:items-start md:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{field.label}</p>
                  <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {field.path}
                  </p>
                </div>
                <p className="break-words text-xs font-medium text-foreground/90">
                  {field.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChequeTable = ({ data }) => {
  const rows = extractChequeRows(data);
  const instrType = asText(data?.instrumentType);
  const siAcc = asText(data?.si_accountNumber);
  const nachAcc = asText(data?.nach_accountNumber);
  const ecsAcc = asText(data?.ecs_accountNumber);
  return (
    <div className="space-y-4">
      {instrType !== "-" && (
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Instrument
          </p>
          <FieldRow label="Instrument Type" value={instrType} />
          {siAcc !== "-" && <FieldRow label="SI Account" value={siAcc} />}
          {nachAcc !== "-" && <FieldRow label="NACH Account" value={nachAcc} />}
          {ecsAcc !== "-" && <FieldRow label="ECS Account" value={ecsAcc} />}
        </div>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              PDC Cheques
            </p>
            <span className="text-xs text-muted-foreground">
              {rows.length} cheque{rows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {[
                    "#",
                    "Cheque No",
                    "Bank",
                    "Account",
                    "Date",
                    "Amount",
                    "Tag",
                    "Favouring",
                    "Signed By",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2 text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2 font-semibold">
                      {asText(r.number)}
                    </td>
                    <td className="px-3 py-2">{asText(r.bankName)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {asText(r.accountNumber)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {asDate(r.date)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      {asMoney(r.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {hasValue(r.tag) && (
                        <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                          {asText(r.tag)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{asText(r.favouring)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {asText(r.signedBy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {instrType === "-" && rows.length === 0 && (
        <InlineEmptyState text="No instrument or cheque data found in this case." />
      )}
    </div>
  );
};

const TabContentBody = ({
  tab,
  loanData,
  approvalBanks,
  resolvedLoanId,
  repaymentValues,
  highlightKey,
}) => {
  if (!tab) return <EmptyTab />;

  const visibleSections = (tab.sections || [])
    .map((section) => ({
      ...section,
      visibleFields: (section.fields || [])
        .map((field) => resolveField(field, loanData))
        .filter((field) => field.visible),
    }))
    .filter((section) => section.visibleFields.length > 0);

  const sectionsBlock = visibleSections.length ? (
    <div className="space-y-3">
      {visibleSections.map((sec) => (
        <SectionCard
          key={sec.title}
          title={sec.title}
          tone={sec.tone}
          fields={sec.fields}
          data={loanData}
          highlightKey={highlightKey}
        />
      ))}
    </div>
  ) : null;

  if (tab.special === "banks") {
    return (
      <div className="space-y-3">
        {approvalBanks.length === 0 ? (
          <InlineEmptyState text="No bank approval data found in this case." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {approvalBanks.map((bank) => (
              <BankStatusCard key={bank.id} bank={bank} loanId={resolvedLoanId} />
            ))}
          </div>
        )}
        {sectionsBlock}
      </div>
    );
  }

  if (tab.special === "cheques") {
    return (
      <div className="space-y-3">
        <ChequeTable data={loanData} />
        {sectionsBlock}
      </div>
    );
  }

  if (tab.special === "repayment") {
    return (
      <div className="space-y-3">
        {repaymentValues ? (
          <RepaymentIntelligencePanel form={null} loanData={repaymentValues} viewOnly />
        ) : (
          <InlineEmptyState text="Repayment intelligence is not available for this case." />
        )}
        {sectionsBlock}
      </div>
    );
  }

  if (tab.special === "all_fields") {
    return (
      <AllFieldsPanel fields={tab.allFields || []} highlightKey={highlightKey} />
    );
  }

  if (!(tab.sections || []).length) {
    return <InlineEmptyState />;
  }

  if (!visibleSections.length) {
    return <InlineEmptyState />;
  }

  return sectionsBlock;
};

const ContinuousPageSection = ({
  tab,
  isActive = false,
  registerRef,
  children,
  hasData = true,
}) => {
  return (
    <section
      ref={registerRef}
      data-tab-key={tab?.key}
      className={`scroll-mt-6 rounded-[26px] border px-4 py-4 md:px-5 md:py-5 ${
        isActive
          ? "border-indigo-300/80 bg-indigo-50/50 dark:border-indigo-800/70 dark:bg-indigo-950/12"
          : "border-border/70 bg-card"
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-border/60 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon name={tab?.icon || "FileText"} size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Page
              </p>
              <h3 className="truncate text-sm font-bold text-foreground md:text-[15px]">
                {tab?.label}
              </h3>
            </div>
          </div>
        </div>
        {!hasData && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-300">
              Empty
            </span>
          </div>
        )}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
};

// Stage pill colors
const stagePillClass = (stageKey, active) => {
  const base =
    "group inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left cursor-pointer select-none";
  if (!active)
    return `${base} border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:bg-muted/35 hover:text-foreground`;
  const map = {
    prefile:
      "border-sky-300/80 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100",
    approval:
      "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100",
    postfile:
      "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
    delivery:
      "border-violet-300/80 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100",
  };
  return `${base} ${map[stageKey] || map.prefile}`;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LoanViewModal = ({ open, onClose, loanId, loan, initialTab }) => {
  const navigate = useNavigate();
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("prefile");
  const [activeTabKey, setActiveTabKey] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightKey, setHighlightKey] = useState("");
  const [preferredTabKey, setPreferredTabKey] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const contentScrollRef = useRef(null);
  const sectionRefs = useRef({});
  const activeTabKeyRef = useRef(null);
  const suppressScrollSyncUntilRef = useRef(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const seedLoanData = useMemo(
    () => (loan && typeof loan === "object" ? loan : null),
    [loan],
  );
  const resolvedLoanId = useMemo(
    () =>
      String(
        firstFilled(
          loanId,
          loan?.loanId,
          loan?.loan_number,
          loan?._id,
          loan?.id,
          "",
        ),
      ).trim(),
    [loanId, loan],
  );
  const fetchCandidateIds = useMemo(
    () =>
      uniqueTokens([
        resolvedLoanId,
        loan?.loanId,
        loan?.loan_number,
        loan?._id,
        loan?.id,
      ]),
    [resolvedLoanId, loan],
  );
  const isMobileViewport = viewportWidth < 768;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    activeTabKeyRef.current = activeTabKey;
  }, [activeTabKey]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [open]);

  // Fetch loan data
  useEffect(() => {
    if (!open) return;
    const loader =
      typeof loansApi.getById === "function"
        ? loansApi.getById
        : loansApi.getLoanById;
    if (typeof loader !== "function" || !fetchCandidateIds.length) {
      setLoading(false);
      setLoanData(seedLoanData);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setLoanData(seedLoanData);
    (async () => {
      let loadedRecord = null;
      let lastError = null;
      for (const candidateId of fetchCandidateIds) {
        try {
          const res = await loader(candidateId);
          loadedRecord = mergeLoanRecord(res, seedLoanData);
          if (loadedRecord) break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!isMounted) return;
      if (loadedRecord) {
        setLoanData(loadedRecord);
      } else {
        if (lastError) {
          console.error("LoanViewModal: failed to load case", {
            candidates: fetchCandidateIds,
            error: lastError,
          });
        }
        setLoanData(seedLoanData);
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [open, fetchCandidateIds, seedLoanData]);

  // Set initial stage/tab from prop
  useEffect(() => {
    if (!open) return;
    const stage = initialToStage[initialTab] || "prefile";
    setActiveStage(stage);
    setPreferredTabKey(initialTab || null);
    setActiveTabKey(null);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setHighlightKey("");
    setPreferredTabKey(initialTab || null);
  }, [open, resolvedLoanId, initialTab]);

  const context = useMemo(() => ({ loanId: resolvedLoanId }), [resolvedLoanId]);

  const baseSubTabs = useMemo(
    () => (loanData ? getStageSubTabs(activeStage, loanData, context) : []),
    [activeStage, loanData, context],
  );
  const mappedFieldEntries = useMemo(() => {
    if (!loanData) return [];
    const entries = [];
    STAGE_ORDER.forEach((stage) => {
      const tabs = getStageSubTabs(stage, loanData, context);
      tabs.forEach((tab) => {
        (Array.isArray(tab.sections) ? tab.sections : []).forEach((section) => {
          (Array.isArray(section?.fields) ? section.fields : []).forEach((field) => {
            const resolved = resolveField(field, loanData);
            if (!resolved.visible || resolved.value === "-") return;
            entries.push({
              id: `mapped:${stage}:${tab.key}:${resolved.key}`,
              label: resolved.label,
              value: resolved.value,
              stage,
              stageLabel: STAGE_META[stage]?.label || stage,
              tabKey: tab.key,
              tabLabel: tab.label,
              sectionTitle: section.title,
              paths: Array.isArray(field.paths) ? field.paths.filter(Boolean) : [],
              highlightKey: resolved.key,
            });
          });
        });
      });
    });
    return entries;
  }, [loanData, context]);
  const mappedEntryByPath = useMemo(() => {
    const map = new Map();
    mappedFieldEntries.forEach((entry) => {
      entry.paths.forEach((path) => {
        if (!map.has(path)) map.set(path, entry);
      });
    });
    return map;
  }, [mappedFieldEntries]);
  const capturedFieldEntries = useMemo(() => {
    const grouped = {
      prefile: [],
      approval: [],
      postfile: [],
      delivery: [],
    };
    if (!loanData) return grouped;
    flattenSearchFields(loanData).forEach((entry) => {
      const matchedEntry = mappedEntryByPath.get(entry.path);
      const stage = matchedEntry?.stage || entry.stage;
      grouped[stage]?.push({
        ...entry,
        stage,
        stageLabel: STAGE_META[stage]?.label || stage,
        tabKey: matchedEntry?.tabKey || `${stage}__all_fields`,
        tabLabel: matchedEntry?.tabLabel || "All Fields",
        sectionTitle: matchedEntry?.sectionTitle || "Captured Fields",
        highlightKey: matchedEntry?.highlightKey || entry.path,
      });
    });
    STAGE_ORDER.forEach((stage) => {
      grouped[stage] = grouped[stage].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    });
    return grouped;
  }, [loanData, mappedEntryByPath]);
  const enrichedBaseSubTabs = useMemo(
    () => mergeCapturedAliasesIntoTabs(baseSubTabs, capturedFieldEntries[activeStage] || []),
    [activeStage, baseSubTabs, capturedFieldEntries],
  );
  const subTabs = useMemo(() => {
    const stageFields = capturedFieldEntries[activeStage] || [];
    if (!stageFields.length) return enrichedBaseSubTabs;
    return [
      ...enrichedBaseSubTabs,
      {
        key: `${activeStage}__all_fields`,
        label: "All Fields",
        icon: "Search",
        special: "all_fields",
        allFields: stageFields,
      },
    ];
  }, [activeStage, enrichedBaseSubTabs, capturedFieldEntries]);
  const flowTabs = useMemo(
    () => subTabs.filter((tab) => tab.special !== "all_fields"),
    [subTabs],
  );
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(deferredSearchQuery);
    if (!query) return [];
    const searchable = STAGE_ORDER.flatMap((stage) => capturedFieldEntries[stage] || []);
    return searchable
      .filter((entry) =>
        normalizeSearchText(
          [
            entry.label,
            entry.value,
            entry.path,
            entry.tabLabel,
            entry.sectionTitle,
            entry.stageLabel,
          ].join(" "),
        ).includes(query),
      )
      .slice(0, 80);
  }, [capturedFieldEntries, deferredSearchQuery]);

  // Auto-select first tab with data when stage changes
  useEffect(() => {
    if (!subTabs.length || !loanData) return;
    if (preferredTabKey && subTabs.some((tab) => tab.key === preferredTabKey)) {
      setActiveTabKey(preferredTabKey);
      return;
    }
    if (activeTabKey && subTabs.some((tab) => tab.key === activeTabKey)) return;
    const firstWithData = subTabs.find((t) => tabHasData(t, loanData, context));
    setActiveTabKey(firstWithData?.key ?? subTabs[0]?.key ?? null);
  }, [subTabs, loanData, context, preferredTabKey, activeTabKey]);

  const activeTab = useMemo(
    () => subTabs.find((t) => t.key === activeTabKey) || subTabs[0] || null,
    [subTabs, activeTabKey],
  );
  const isAllFieldsView = activeTab?.special === "all_fields";

  const repaymentValues = useMemo(
    () => (loanData ? buildRepaymentViewerValues(loanData) : null),
    [loanData],
  );

  const approvalBanks = useMemo(
    () => (loanData ? getApprovalBanksForViewer(loanData, resolvedLoanId) : []),
    [loanData, resolvedLoanId],
  );

  // Derived header info
  const customerName = loanData
    ? asText(firstFilled(loanData.customerName, loanData.businessName, "—"))
    : "—";
  const loanType = loanData
    ? asText(firstFilled(loanData.typeOfLoan, loanData.loanType, ""))
    : "";
  const vehicleLabel = loanData
    ? [loanData.vehicleMake, loanData.vehicleModel, loanData.vehicleVariant]
        .filter(hasValue)
        .map(asText)
        .join(" ")
    : "";
  const caseStatus = loanData
    ? asText(firstFilled(loanData.approval_status, loanData.status, ""))
    : "";
  const loanNumber = loanData
    ? asText(
        firstFilled(
          loanData.loan_number,
          loanData.loanId,
          loanData.postfile_loanNumber,
          "",
        ),
      )
    : asText(resolvedLoanId);

  const initials =
    customerName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?";

  const statusBadgeClass = () => {
    const s = caseStatus.toLowerCase();
    if (s === "disbursed")
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (s === "approved")
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    if (s === "rejected")
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (s)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-muted text-muted-foreground";
  };
  const suppressScrollSync = useCallback((duration = 500) => {
    suppressScrollSyncUntilRef.current = Date.now() + duration;
  }, []);
  const activateTab = useCallback(
    (tabKey, options = {}) => {
      const { stage = null, highlight = null, clearSearch = false } = options;
      suppressScrollSync();
      if (stage) setActiveStage(stage);
      setPreferredTabKey(tabKey || null);
      setActiveTabKey(tabKey || null);
      if (typeof highlight === "string") setHighlightKey(highlight);
      if (clearSearch) setSearchQuery("");
    },
    [suppressScrollSync],
  );
  const handleSearchSelection = (item) => {
    if (!item) return;
    activateTab(item.tabKey, {
      stage: item.stage,
      highlight: item.highlightKey || item.path || item.label,
      clearSearch: true,
    });
  };
  const handleOpenFile = () => {
    const targetId = loan?._id || loanData?._id || loanData?.loanId || resolvedLoanId;
    if (!targetId) return;
    onClose?.();
    navigate(`/loans/edit/${targetId}`);
  };

  useEffect(() => {
    if (!open || loading || !loanData || !preferredTabKey || isAllFieldsView) return;
    suppressScrollSync();
    const frame = window.requestAnimationFrame(() => {
      const container = contentScrollRef.current;
      const section = sectionRefs.current[preferredTabKey];
      if (!container || !section) return;
      container.scrollTo({
        top: Math.max(0, section.offsetTop - 16),
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, loading, loanData, preferredTabKey, isAllFieldsView, suppressScrollSync]);

  useEffect(() => {
    if (!open || loading || isAllFieldsView) return undefined;
    const container = contentScrollRef.current;
    if (!container || !flowTabs.length) return undefined;

    let frame = null;
    const syncActiveTabFromScroll = () => {
      if (!contentScrollRef.current) return;
      if (Date.now() < suppressScrollSyncUntilRef.current) return;
      const scrollTop = contentScrollRef.current.scrollTop;
      const activationLine = scrollTop + 140;
      const candidate = flowTabs.reduce((current, tab) => {
        const node = sectionRefs.current[tab.key];
        if (!node) return current;
        if (node.offsetTop - 96 <= activationLine) return tab.key;
        return current;
      }, flowTabs[0]?.key || null);

      if (candidate && candidate !== activeTabKeyRef.current) {
        setActiveTabKey(candidate);
      }
    };

    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveTabFromScroll);
    };

    syncActiveTabFromScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
    };
  }, [open, loading, isAllFieldsView, flowTabs]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal shell */}
      <div
        className="fixed z-50 bg-background border border-border shadow-2xl flex flex-col"
        style={{
          top: isMobileViewport ? "0" : "calc(50% + 18px)",
          left: isMobileViewport ? "0" : "50%",
          transform: isMobileViewport ? "none" : "translate(-50%, -50%)",
          width: isMobileViewport ? "100vw" : "min(1120px, 96vw)",
          height: isMobileViewport ? "100dvh" : "min(90vh, 840px)",
          borderRadius: isMobileViewport ? "0" : "18px",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="border-b border-border bg-card flex-shrink-0">
          <div className="px-3 py-3 md:px-5 md:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    {loading ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : (
                      <span className="text-sm font-bold">{initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground md:text-base">
                        {customerName}
                      </span>
                      {caseStatus && (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadgeClass()}`}
                        >
                          {caseStatus}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {loanNumber && loanNumber !== "-" && (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                          {loanNumber}
                        </span>
                      )}
                      {loanType && (
                        <span className="rounded-full border border-border/70 px-2.5 py-1 font-medium">
                          {loanType}
                        </span>
                      )}
                      {vehicleLabel && (
                        <span className="truncate rounded-full border border-border/70 px-2.5 py-1 font-medium">
                          {vehicleLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:ml-4">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                  title="Close"
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
            </div>

            <div className="mt-3 hidden grid-cols-4 gap-2 md:grid">
              {STAGE_ORDER.map((sk) => {
                const stageMeta = STAGE_META[sk];
                const isActive = activeStage === sk;
                return (
                  <button
                    key={sk}
                    className={stagePillClass(sk, isActive)}
                    onClick={() => {
                      suppressScrollSync();
                      setPreferredTabKey(null);
                      setActiveStage(sk);
                      setHighlightKey("");
                    }}
                  >
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                        isActive
                          ? "border-current/20 bg-white/70 dark:bg-black/20"
                          : "border-border/60 bg-background/80"
                      }`}
                    >
                      <Icon name={stageMeta.icon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.14em]">
                      {stageMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-b border-border bg-background/90 px-3 py-3 md:px-5">
          <div className="relative min-w-0">
            <Icon
              name="Search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search any field or value, for example Aadhaar, EMI, PAN, IFSC"
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-indigo-400"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <Icon name="X" size={14} />
              </button>
            ) : null}
          </div>
          {normalizeSearchText(deferredSearchQuery) ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Field Search Results
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {searchResults.length ? (
                  <div className="space-y-1.5">
                    {searchResults.map((item) => (
                      <SearchResultRow
                        key={`${item.stage}-${item.path}-${item.label}`}
                        item={item}
                        onSelect={handleSearchSelection}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No fields match this search.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── BODY ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Mobile: horizontal stage + tab strip */}
            <div className="flex gap-2 px-3 py-2 border-b border-border overflow-x-auto md:hidden">
              {STAGE_ORDER.map((sk) => (
                <button
                  key={sk}
                  onClick={() => {
                    suppressScrollSync();
                    setPreferredTabKey(null);
                    setActiveStage(sk);
                    setHighlightKey("");
                  }}
                  className={`flex-shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    activeStage === sk
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={STAGE_META[sk].icon} size={11} />
                    <span>{STAGE_META[sk].label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Sub-tab bar (mobile) */}
            <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
              {subTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => activateTab(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTabKey === tab.key
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon name={tab.icon} size={11} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div ref={contentScrollRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-5 lg:px-6">
              {loading && (
                <div className="flex items-center justify-center h-full">
                  <Spin size="large" />
                </div>
              )}

              {!loading && !loanData && (
                <EmptyTab text="Could not load case data." />
              )}

              {!loading && loanData && activeTab && (
                <div className="w-full space-y-4">
                  {isAllFieldsView ? (
                    <TabContentBody
                      tab={activeTab}
                      loanData={loanData}
                      approvalBanks={approvalBanks}
                      resolvedLoanId={resolvedLoanId}
                      repaymentValues={repaymentValues}
                      highlightKey={highlightKey}
                    />
                  ) : (
                    flowTabs.map((tab) => (
                      <ContinuousPageSection
                        key={tab.key}
                        tab={tab}
                        isActive={activeTabKey === tab.key}
                        hasData={tabHasData(tab, loanData, context)}
                        registerRef={(node) => {
                          if (node) sectionRefs.current[tab.key] = node;
                          else delete sectionRefs.current[tab.key];
                        }}
                      >
                        <TabContentBody
                          tab={tab}
                          loanData={loanData}
                          approvalBanks={approvalBanks}
                          resolvedLoanId={resolvedLoanId}
                          repaymentValues={repaymentValues}
                          highlightKey={highlightKey}
                        />
                      </ContinuousPageSection>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2.5 md:px-5 border-t border-border bg-card flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {loanData?.updatedAt
              ? `Updated ${asDateTime(loanData.updatedAt)}`
              : resolvedLoanId
                ? `Case ID: ${resolvedLoanId}`
                : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setDocsOpen(true)}
            >
              <Icon name="Paperclip" size={13} />
              Documents
            </button>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              onClick={handleOpenFile}
            >
              <Icon name="ExternalLink" size={13} />
              Open File
            </button>
          </div>
        </div>
      </div>

      {/* Documents modal */}
      {docsOpen && (
        <LoanDocumentsModal
          open={docsOpen}
          onClose={() => setDocsOpen(false)}
          loan={loanData}
          loanId={loanData?._id || resolvedLoanId}
        />
      )}
    </>
  );
};

export default LoanViewModal;
