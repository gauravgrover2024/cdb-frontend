// src/modules/loans/components/LoanFormWithSteps.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, message } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useFormAutoSave, AutoSaveIndicator } from "../../../utils/formDataProtection";

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
import BulkLoanCreationSection from "./loan-form/pre-file/BulkLoanCreationSection";

import LoanApprovalStep from "./loan-form/loan-approval/LoanApprovalStep";
import PostFileStep from "./loan-form/post-file/PostFileStep";
import VehicleDeliveryStep from "./loan-form/vehicle-delivery/VehicleDeliveryStep";
import PayoutSection from "./loan-form/payout/PayoutSection";

import LoanStickyHeader from "./LoanStickyHeader";
import StageFooter from "./StageFooter";
import LoanStepperSidebar from "./LoanStepperSidebar";
import Icon from "../../../components/AppIcon";
import { loansApi } from "../../../api/loans";
import { customersApi } from "../../../api/customers";

// ... (existing imports/code) ...


// Date helpers (safe for AntD)
// ----------------------------
const toDayjs = (val) => {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val;
  if (typeof val === "object") {
    const mongoDate = val?.$date || val?.date || val?.value;
    if (mongoDate) {
      const md = dayjs(mongoDate);
      if (md.isValid()) return md;
    }
  }

  let d = dayjs(val);
  if (d.isValid()) return d;

  d = dayjs(val, "DD MMM YYYY", true);
  if (d.isValid()) return d;

  return null;
};

const convertAnyDateToDayjsDeep = (value, key = "") => {
  if (!value) return value;

  if (dayjs.isDayjs(value)) return value;
  if (value instanceof Date) return dayjs(value);
  if (typeof value === "object" && (value?.$date || value?.date || value?.value)) {
    const rawDate = value?.$date || value?.date || value?.value;
    const parsed = dayjs(rawDate);
    if (parsed.isValid()) {
      // keep native date string for partner/director input type="date"
      if (key === "dateOfBirth") return parsed.format("YYYY-MM-DD");
      return parsed;
    }
  }

  if (typeof value === "string") {
    // Keep plain string for native <input type="date"> fields.
    if (key === "dateOfBirth") return value;

    // ✅ ONLY convert real ISO-like date strings
    // Examples:
    // 2026-01-27T09:35:54.250Z
    // 1993-06-16
    const isIsoDate = /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value);

    if (!isIsoDate) return value;

    const d = dayjs(value);
    return d.isValid() ? d : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertAnyDateToDayjsDeep(item, key));
  }

  if (typeof value === "object") {
    const out = {};
    for (const k in value) {
      out[k] = convertAnyDateToDayjsDeep(value[k], k);
    }
    return out;
  }

  return value;
};

const DATE_FIELD_NAMES = new Set([
  "dob",
  "nomineeDob",
  "co_dob",
  "gu_dob",
  "signatory_dob",
  "identityProofExpiry",
  "receivingDate",
  "receivingTime",
  "approval_approvalDate",
  "approval_disbursedDate",
  "postfile_firstEmiDate",
  "delivery_date",
  "invoice_date",
  "invoice_received_date",
  "rc_redg_date",
  "rc_received_date",
  "dispatch_date",
  "disbursement_date",
]);

const STEP_OPEN_DEFAULT_FIELDS = {
  profile: [
    { name: "leadDate", type: "dayjs" },
    { name: "leadTime", type: "dayjs" },
  ],
  prefile: [
    { name: "receivingDate", type: "dayjs" },
    { name: "receivingTime", type: "dayjs" },
  ],
  approval: [{ name: "approval_approvalDate", type: "dayjs" }],
  postfile: [
    { name: "postfile_approvalDate", type: "iso-date" },
    { name: "dispatch_date", type: "iso-date" },
    { name: "dispatch_time", type: "hhmm" },
    { name: "disbursement_date", type: "iso-date" },
    { name: "disbursement_time", type: "hhmm" },
  ],
  delivery: [
    { name: "delivery_date", type: "iso-date" },
    { name: "insurance_policy_start_date", type: "iso-date" },
    { name: "invoice_date", type: "iso-date" },
    { name: "invoice_received_date", type: "iso-date" },
    { name: "rc_redg_date", type: "iso-date" },
    { name: "rc_received_date", type: "iso-date" },
  ],
};

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (dayjs.isDayjs(value)) return value.isValid();
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "object" && (value?.$date || value?.date || value?.value)) {
    return hasMeaningfulValue(value?.$date || value?.date || value?.value);
  }
  return true;
};

const normalizeLoanTypeLabel = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return value;
  if (text.includes("cash-in") || text.includes("cash in")) return "Car Cash-in";
  if (text.includes("refinance") || text.includes("re-finance")) return "Refinance";
  if (text.includes("used")) return "Used Car";
  if (text.includes("new") || text.includes("cash sale") || text === "cash") return "New Car";
  return value;
};

const normalizeOccupationLabel = (value) => {
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!text) return value;
  if (text.includes("salaried")) return "Salaried";
  if (text.includes("professional")) return "Self Employed Professional";
  if (text.includes("self employed") || text.includes("selfemployed")) return "Self Employed";
  return value;
};

const normalizeKnownDateFields = (value, key = "") => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeKnownDateFields(item));
  }

  if (value && typeof value === "object" && !dayjs.isDayjs(value) && !(value instanceof Date)) {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = normalizeKnownDateFields(childValue, childKey);
    }
    return out;
  }

  if (DATE_FIELD_NAMES.has(key)) {
    return toDayjs(value);
  }

  return value;
};

// Clean empty and undefined values from object (used for cache etc.)
const cleanEmptyValues = (obj, omitFields = []) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => cleanEmptyValues(item, omitFields))
      .filter((item) => item !== null && item !== undefined && item !== "");
  }

  const cleaned = {};
  for (const key in obj) {
    if (omitFields.includes(key)) continue;
    
    const value = obj[key];
    
    // Skip nulls, undefined, empty strings
    if (value === null || value === undefined || value === "") continue;
    
    // Recursively clean nested objects
    if (typeof value === "object" && !dayjs.isDayjs(value) && !(value instanceof Date)) {
      const nested = cleanEmptyValues(value, omitFields);
      if (Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// For loan submit: keep empty strings and false so every section's user input is stored as-is
const cleanPayloadForSubmit = (obj, omitFields = []) => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPayloadForSubmit(item, omitFields));
  }

  const cleaned = {};
  for (const key in obj) {
    if (omitFields.includes(key)) continue;
    const value = obj[key];
    // Only skip undefined (keep "", null, 0, false so DB reflects user feed)
    if (value === undefined) continue;
    if (typeof value === "object" && value !== null && !dayjs.isDayjs(value) && !(value instanceof Date)) {
      const nested = cleanPayloadForSubmit(value, omitFields);
      cleaned[key] = nested;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
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

const INSTRUMENT_FIELD_KEYS = [
  "instrumentType",
  "si_accountNumber",
  "si_signedBy",
  "si_image",
  "nach_accountNumber",
  "nach_signedBy",
  "nach_image",
  "ecs_micrCode",
  "ecs_bankName",
  "ecs_accountNumber",
  "ecs_date",
  "ecs_amount",
  "ecs_tag",
  "ecs_favouring",
  "ecs_signedBy",
  "ecs_image",
  ...Array.from({ length: 30 }, (_, idx) => idx + 1).flatMap((i) => [
    `cheque_${i}_number`,
    `cheque_${i}_bankName`,
    `cheque_${i}_accountNumber`,
    `cheque_${i}_date`,
    `cheque_${i}_amount`,
    `cheque_${i}_tag`,
    `cheque_${i}_favouring`,
    `cheque_${i}_signedBy`,
    `cheque_${i}_image`,
  ]),
];

const hasInstrumentValues = (record) => {
  if (!record || typeof record !== "object") return false;
  return INSTRUMENT_FIELD_KEYS.some((key) => {
    const value = record[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
};

const mergeInstrumentFallback = (payload, loadedLoan) => {
  if (!loadedLoan || typeof loadedLoan !== "object") return payload;
  if (hasInstrumentValues(payload)) return payload;
  if (!hasInstrumentValues(loadedLoan)) return payload;

  const merged = { ...payload };
  INSTRUMENT_FIELD_KEYS.forEach((key) => {
    if (merged[key] === undefined && loadedLoan[key] !== undefined) {
      merged[key] = loadedLoan[key];
    }
  });
  return merged;
};

const normalizeIdentityValue = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizePhoneValue = (value) => String(value || "").replace(/\D/g, "");

const PREFILE_SECTIONS = [
  {
    id: "personal_pre",
    title: "Applicant Snapshot",
    description: "Core identity, address and company-facing applicant details.",
    icon: "User",
    accent: "from-sky-500/20 via-cyan-500/10 to-transparent dark:from-sky-400/20 dark:via-cyan-400/10 dark:to-transparent",
    chip: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:bg-sky-400/12 dark:text-sky-200 dark:ring-sky-400/20",
    panel: "border-sky-200/70 dark:border-sky-900/70",
    iconWrap: "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(14,165,233,0.45)] dark:shadow-[0_22px_55px_-28px_rgba(56,189,248,0.35)]",
  },
  {
    id: "occupational",
    title: "Occupation & Business",
    description: "Business constitution, profession, vintage and partner structure.",
    icon: "Building2",
    accent: "from-emerald-500/18 via-teal-500/10 to-transparent dark:from-emerald-400/18 dark:via-teal-400/10 dark:to-transparent",
    chip: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/12 dark:text-emerald-200 dark:ring-emerald-400/20",
    panel: "border-emerald-200/70 dark:border-emerald-900/70",
    iconWrap: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(16,185,129,0.4)] dark:shadow-[0_22px_55px_-28px_rgba(52,211,153,0.32)]",
  },
  {
    id: "income_banking",
    title: "Banking Backbone",
    description: "PAN, income, account details and banking proofs in one place.",
    icon: "Wallet",
    accent: "from-violet-500/18 via-fuchsia-500/10 to-transparent dark:from-violet-400/18 dark:via-fuchsia-400/10 dark:to-transparent",
    chip: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-200 dark:ring-violet-400/20",
    panel: "border-violet-200/70 dark:border-violet-900/70",
    iconWrap: "bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(139,92,246,0.4)] dark:shadow-[0_22px_55px_-28px_rgba(167,139,250,0.32)]",
  },
  {
    id: "vehicle_loan",
    title: "Vehicle & Loan Structure",
    description: "Vehicle pricing, showroom mapping and registration logic.",
    icon: "CarFront",
    accent: "from-amber-500/20 via-orange-500/10 to-transparent dark:from-amber-400/20 dark:via-orange-400/10 dark:to-transparent",
    chip: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-200 dark:ring-amber-400/20",
    panel: "border-amber-200/70 dark:border-amber-900/70",
    iconWrap: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(245,158,11,0.42)] dark:shadow-[0_22px_55px_-28px_rgba(251,191,36,0.32)]",
  },
  {
    id: "references",
    title: "References",
    description: "Relationship-backed references and reachable contacts.",
    icon: "Users",
    accent: "from-rose-500/18 via-pink-500/10 to-transparent dark:from-rose-400/18 dark:via-pink-400/10 dark:to-transparent",
    chip: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:bg-rose-400/12 dark:text-rose-200 dark:ring-rose-400/20",
    panel: "border-rose-200/70 dark:border-rose-900/70",
    iconWrap: "bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(244,63,94,0.38)] dark:shadow-[0_22px_55px_-28px_rgba(251,113,133,0.32)]",
  },
  {
    id: "kyc",
    title: "KYC Documents",
    description: "Proof stack for applicant validation and audit readiness.",
    icon: "ShieldCheck",
    accent: "from-indigo-500/18 via-blue-500/10 to-transparent dark:from-indigo-400/18 dark:via-blue-400/10 dark:to-transparent",
    chip: "bg-indigo-500/12 text-indigo-700 ring-indigo-500/20 dark:bg-indigo-400/12 dark:text-indigo-200 dark:ring-indigo-400/20",
    panel: "border-indigo-200/70 dark:border-indigo-900/70",
    iconWrap: "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(99,102,241,0.38)] dark:shadow-[0_22px_55px_-28px_rgba(129,140,248,0.32)]",
  },
  {
    id: "section7",
    title: "Record Control",
    description: "Record source, prepared-by trail and legacy intake details.",
    icon: "FileCheck",
    accent: "from-slate-500/18 via-zinc-500/10 to-transparent dark:from-slate-400/18 dark:via-zinc-400/10 dark:to-transparent",
    chip: "bg-slate-500/12 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-200 dark:ring-slate-400/20",
    panel: "border-slate-200/80 dark:border-slate-800/80",
    iconWrap: "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(71,85,105,0.34)] dark:shadow-[0_22px_55px_-28px_rgba(148,163,184,0.22)]",
  },
  {
    id: "co_applicant",
    title: "Co-Applicant",
    description: "Secondary applicant identity, profession and linked risk view.",
    icon: "UserCheck",
    accent: "from-cyan-500/18 via-sky-500/10 to-transparent dark:from-cyan-400/18 dark:via-sky-400/10 dark:to-transparent",
    chip: "bg-cyan-500/12 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-400/12 dark:text-cyan-200 dark:ring-cyan-400/20",
    panel: "border-cyan-200/70 dark:border-cyan-900/70",
    iconWrap: "bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(6,182,212,0.38)] dark:shadow-[0_22px_55px_-28px_rgba(34,211,238,0.3)]",
  },
  {
    id: "guarantor",
    title: "Guarantor",
    description: "Guarantee support, fallback identity and backup liability trail.",
    icon: "UserRoundSearch",
    accent: "from-lime-500/18 via-green-500/10 to-transparent dark:from-lime-400/18 dark:via-green-400/10 dark:to-transparent",
    chip: "bg-lime-500/12 text-lime-700 ring-lime-500/20 dark:bg-lime-400/12 dark:text-lime-200 dark:ring-lime-400/20",
    panel: "border-lime-200/70 dark:border-lime-900/70",
    iconWrap: "bg-lime-500 text-white dark:bg-lime-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(132,204,22,0.38)] dark:shadow-[0_22px_55px_-28px_rgba(163,230,53,0.3)]",
  },
  {
    id: "auth_signatory",
    title: "Authorised Signatory",
    description: "Signatory authority, same-as-co-applicant sync and execution details.",
    icon: "Stamp",
    accent: "from-fuchsia-500/18 via-purple-500/10 to-transparent dark:from-fuchsia-400/18 dark:via-purple-400/10 dark:to-transparent",
    chip: "bg-fuchsia-500/12 text-fuchsia-700 ring-fuchsia-500/20 dark:bg-fuchsia-400/12 dark:text-fuchsia-200 dark:ring-fuchsia-400/20",
    panel: "border-fuchsia-200/70 dark:border-fuchsia-900/70",
    iconWrap: "bg-fuchsia-500 text-white dark:bg-fuchsia-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(217,70,239,0.36)] dark:shadow-[0_22px_55px_-28px_rgba(232,121,249,0.3)]",
  },
];

const PROFILE_SECTIONS = [
  {
    id: "lead",
    title: "Lead Details",
    description: "Source, ownership and intake metadata for the case.",
    icon: "Target",
    accent: "from-sky-500/18 via-cyan-500/10 to-transparent dark:from-sky-400/14 dark:via-cyan-400/8 dark:to-transparent",
    chip: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:bg-sky-400/12 dark:text-sky-200 dark:ring-sky-400/20",
    panel: "border-sky-200/70 dark:border-sky-900/70",
    iconWrap: "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(14,165,233,0.35)] dark:shadow-[0_22px_55px_-28px_rgba(56,189,248,0.24)]",
  },
  {
    id: "vehicle",
    title: "Vehicle Details",
    description: "Vehicle type, variant and base case characteristics.",
    icon: "CarFront",
    accent: "from-emerald-500/18 via-teal-500/10 to-transparent dark:from-emerald-400/14 dark:via-teal-400/8 dark:to-transparent",
    chip: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/12 dark:text-emerald-200 dark:ring-emerald-400/20",
    panel: "border-emerald-200/70 dark:border-emerald-900/70",
    iconWrap: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(16,185,129,0.35)] dark:shadow-[0_22px_55px_-28px_rgba(52,211,153,0.24)]",
  },
  {
    id: "finance",
    title: "Finance Details",
    description: "Financing intent and high-level credit context.",
    icon: "Wallet",
    accent: "from-violet-500/18 via-fuchsia-500/10 to-transparent dark:from-violet-400/14 dark:via-fuchsia-400/8 dark:to-transparent",
    chip: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-200 dark:ring-violet-400/20",
    panel: "border-violet-200/70 dark:border-violet-900/70",
    iconWrap: "bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(139,92,246,0.32)] dark:shadow-[0_22px_55px_-28px_rgba(167,139,250,0.24)]",
  },
  {
    id: "personal",
    title: "Personal Details",
    description: "Identity, address and personal profile for the applicant.",
    icon: "User",
    accent: "from-amber-500/18 via-orange-500/10 to-transparent dark:from-amber-400/14 dark:via-orange-400/8 dark:to-transparent",
    chip: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-200 dark:ring-amber-400/20",
    panel: "border-amber-200/70 dark:border-amber-900/70",
    iconWrap: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(245,158,11,0.34)] dark:shadow-[0_22px_55px_-28px_rgba(251,191,36,0.24)]",
  },
  {
    id: "employment",
    title: "Employment Details",
    description: "Employer or business occupation details and tenure.",
    icon: "Building2",
    accent: "from-cyan-500/18 via-sky-500/10 to-transparent dark:from-cyan-400/14 dark:via-sky-400/8 dark:to-transparent",
    chip: "bg-cyan-500/12 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-400/12 dark:text-cyan-200 dark:ring-cyan-400/20",
    panel: "border-cyan-200/70 dark:border-cyan-900/70",
    iconWrap: "bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(6,182,212,0.32)] dark:shadow-[0_22px_55px_-28px_rgba(34,211,238,0.24)]",
  },
  {
    id: "income",
    title: "Income Details",
    description: "Income profile and earnings-backed eligibility details.",
    icon: "IndianRupee",
    accent: "from-rose-500/18 via-pink-500/10 to-transparent dark:from-rose-400/14 dark:via-pink-400/8 dark:to-transparent",
    chip: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:bg-rose-400/12 dark:text-rose-200 dark:ring-rose-400/20",
    panel: "border-rose-200/70 dark:border-rose-900/70",
    iconWrap: "bg-rose-500 text-white dark:bg-rose-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(244,63,94,0.32)] dark:shadow-[0_22px_55px_-28px_rgba(251,113,133,0.24)]",
  },
  {
    id: "bank",
    title: "Bank Details",
    description: "Account, IFSC and banking linkage for processing.",
    icon: "Landmark",
    accent: "from-indigo-500/18 via-blue-500/10 to-transparent dark:from-indigo-400/14 dark:via-blue-400/8 dark:to-transparent",
    chip: "bg-indigo-500/12 text-indigo-700 ring-indigo-500/20 dark:bg-indigo-400/12 dark:text-indigo-200 dark:ring-indigo-400/20",
    panel: "border-indigo-200/70 dark:border-indigo-900/70",
    iconWrap: "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(99,102,241,0.32)] dark:shadow-[0_22px_55px_-28px_rgba(129,140,248,0.24)]",
  },
  {
    id: "references",
    title: "References",
    description: "Relationship-backed references and alternate contacts.",
    icon: "Users",
    accent: "from-lime-500/18 via-green-500/10 to-transparent dark:from-lime-400/14 dark:via-green-400/8 dark:to-transparent",
    chip: "bg-lime-500/12 text-lime-700 ring-lime-500/20 dark:bg-lime-400/12 dark:text-lime-200 dark:ring-lime-400/20",
    panel: "border-lime-200/70 dark:border-lime-900/70",
    iconWrap: "bg-lime-500 text-white dark:bg-lime-400 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(132,204,22,0.32)] dark:shadow-[0_22px_55px_-28px_rgba(163,230,53,0.24)]",
  },
  {
    id: "kyc",
    title: "KYC Details",
    description: "KYC identity and proof document references.",
    icon: "ShieldCheck",
    accent: "from-slate-500/18 via-zinc-500/10 to-transparent dark:from-slate-400/14 dark:via-zinc-400/8 dark:to-transparent",
    chip: "bg-slate-500/12 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-200 dark:ring-slate-400/20",
    panel: "border-slate-200/80 dark:border-zinc-800",
    iconWrap: "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950",
    glow: "shadow-[0_18px_45px_-24px_rgba(71,85,105,0.3)] dark:shadow-[0_22px_55px_-28px_rgba(148,163,184,0.2)]",
  },
];

const StageWorkbench = ({
  eyebrow,
  title,
  description,
  icon,
  tone = "sky",
  children,
}) => {
  const toneMap = {
    sky: {
      badge:
        "border-sky-200/80 bg-sky-500/10 text-sky-700 dark:border-sky-900/80 dark:bg-sky-400/10 dark:text-sky-200",
      iconWrap:
        "bg-gradient-to-br from-sky-500 to-cyan-500 text-white dark:from-sky-400 dark:to-cyan-400 dark:text-slate-950",
      panel:
        "from-slate-50 via-white to-sky-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
      overlay:
        "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.12),transparent_28%)]",
    },
    violet: {
      badge:
        "border-violet-200/80 bg-violet-500/10 text-violet-700 dark:border-violet-900/80 dark:bg-violet-400/10 dark:text-violet-200",
      iconWrap:
        "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white dark:from-violet-400 dark:to-fuchsia-400 dark:text-slate-950",
      panel:
        "from-slate-50 via-white to-violet-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
      overlay:
        "bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(192,132,252,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_28%)]",
    },
    amber: {
      badge:
        "border-amber-200/80 bg-amber-500/10 text-amber-700 dark:border-amber-900/80 dark:bg-amber-400/10 dark:text-amber-200",
      iconWrap:
        "bg-gradient-to-br from-amber-500 to-orange-500 text-white dark:from-amber-400 dark:to-orange-400 dark:text-slate-950",
      panel:
        "from-slate-50 via-white to-amber-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
      overlay:
        "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.12),transparent_28%)]",
    },
    emerald: {
      badge:
        "border-emerald-200/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-400/10 dark:text-emerald-200",
      iconWrap:
        "bg-gradient-to-br from-emerald-500 to-teal-500 text-white dark:from-emerald-400 dark:to-teal-400 dark:text-slate-950",
      panel:
        "from-slate-50 via-white to-emerald-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
      overlay:
        "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.12),transparent_28%)]",
    },
  };
  const styles = toneMap[tone] || toneMap.sky;

  return (
    <div className="loan-form-workbench space-y-5 md:space-y-6">
      <div className={`relative overflow-hidden rounded-[32px] border border-border/70 bg-gradient-to-br px-5 py-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 ${styles.panel}`}>
        <div className={`pointer-events-none absolute inset-0 ${styles.overlay}`} />
        <div className="relative flex items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${styles.badge}`}>
              <Icon name={icon} size={14} />
              {eyebrow}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_18px_40px_-22px_rgba(15,23,42,0.32)] lg:flex ${styles.iconWrap}`}>
            <Icon name={icon} size={24} />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

const PrefileSectionShell = ({
  id,
  title,
  description,
  icon,
  index,
  accent,
  chip,
  panel,
  iconWrap,
  glow,
  children,
}) => (
  <section
    id={id}
    className={`group relative overflow-hidden rounded-2xl border bg-card/95 dark:bg-black/90 backdrop-blur-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)] ${panel} ${glow}`}
  >
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
    <div className="relative border-b border-border/50 px-4 py-3 md:px-5 md:py-3.5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${iconWrap}`}>
          <Icon name={icon} size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground md:text-base">{title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${chip}`}>
              S{String(index || 0).padStart(2, "0")}
            </span>
          </div>
          <p className="mt-0.5 max-w-3xl text-[11px] leading-5 text-muted-foreground md:text-xs">{description}</p>
        </div>
      </div>
    </div>
    <div className="relative p-2 md:p-2.5">{children}</div>
  </section>
);

const LoanFormWithSteps = ({ mode, initialData }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const loanIdFromRoute = params?.loanId || params?.id;
  const freshLoanToken = useMemo(
    () => new URLSearchParams(location.search).get("fresh"),
    [location.search],
  );

  const isEditMode = useMemo(() => {
    return Boolean(mode === "edit" || loanIdFromRoute);
  }, [mode, loanIdFromRoute]);

  // ============================================
  // ⚡ AUTO-SAVE FORM DATA PROTECTION
  // ============================================
  const {
    autoSaveStatus,
    saveToLocalStorage,
    clearSavedFormData,
    restoreSavedFormData,
    handleFormValuesChange,
  } = useFormAutoSave('LOAN_FORM_DATA', form, isEditMode);

  // Watch finance flag early
  const watchedIsFinanced = Form.useWatch("isFinanced", form);
  const watchedHasCoApplicant = Form.useWatch("hasCoApplicant", form);
  const watchedHasGuarantor = Form.useWatch("hasGuarantor", form);
  const watchedApplicantType = Form.useWatch("applicantType", form);
  const watchedApprovalBankName = Form.useWatch("approval_bankName", form);
  const watchedAadhaarCardDocUrl = Form.useWatch("aadhaarCardDocUrl", form);
  const watchedPanCardDocUrl = Form.useWatch("panCardDocUrl", form);
  const watchedPassportDocUrl = Form.useWatch("passportDocUrl", form);
  const watchedDlDocUrl = Form.useWatch("dlDocUrl", form);
  const watchedAddressProofDocUrl = Form.useWatch("addressProofDocUrl", form);
  const watchedGstDocUrl = Form.useWatch("gstDocUrl", form);
  const watchedCoAadhaarCardDocUrl = Form.useWatch("co_aadhaarCardDocUrl", form);
  const watchedCoPanCardDocUrl = Form.useWatch("co_panCardDocUrl", form);
  const watchedCoPassportDocUrl = Form.useWatch("co_passportDocUrl", form);
  const watchedCoDlDocUrl = Form.useWatch("co_dlDocUrl", form);
  const watchedCoAddressProofDocUrl = Form.useWatch("co_addressProofDocUrl", form);
  const watchedGuAadhaarCardDocUrl = Form.useWatch("gu_aadhaarCardDocUrl", form);
  const watchedGuPanCardDocUrl = Form.useWatch("gu_panCardDocUrl", form);
  const watchedGuPassportDocUrl = Form.useWatch("gu_passportDocUrl", form);
  const watchedGuDlDocUrl = Form.useWatch("gu_dlDocUrl", form);
  const watchedGuAddressProofDocUrl = Form.useWatch("gu_addressProofDocUrl", form);
  const watchedDeliveryInvoiceFile = Form.useWatch("delivery_invoiceFile", form);
  const watchedDeliveryRcFile = Form.useWatch("delivery_rcFile", form);
  const watchedLeadDate = Form.useWatch("leadDate", form);
  const watchedLeadTime = Form.useWatch("leadTime", form);
  const [activeStep, setActiveStep] = useState("profile");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const loadedLoanRef = React.useRef(null);
  const stepDefaultsInitializedRef = React.useRef(new Set());
  const stepDefaultsReadyRef = React.useRef(!isEditMode);

  useEffect(() => {
    stepDefaultsInitializedRef.current = new Set();
    stepDefaultsReadyRef.current = !isEditMode;
  }, [isEditMode, loanIdFromRoute, freshLoanToken]);

  // In cash cases, block only unavailable stages (keep profile/prefile/delivery usable).
  React.useEffect(() => {
    if (
      watchedIsFinanced === "No" &&
      ["approval", "postfile", "payout"].includes(activeStep)
    ) {
      setActiveStep("delivery");
    }
  }, [watchedIsFinanced, activeStep]);

  // Auto-fill operational date/time fields when each step is opened the first time.
  useEffect(() => {
    if (!stepDefaultsReadyRef.current) return;
    if (stepDefaultsInitializedRef.current.has(activeStep)) return;

    const fields = STEP_OPEN_DEFAULT_FIELDS[activeStep] || [];
    if (!fields.length) {
      stepDefaultsInitializedRef.current.add(activeStep);
      return;
    }

    const now = dayjs();
    const patch = {};

    fields.forEach(({ name, type }) => {
      const existingValue = form.getFieldValue(name);
      if (hasMeaningfulValue(existingValue)) return;

      if (type === "dayjs") {
        patch[name] = now;
        return;
      }
      if (type === "iso-date") {
        patch[name] = now.format("YYYY-MM-DD");
        return;
      }
      if (type === "hhmm") {
        patch[name] = now.format("HH:mm");
      }
    });

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
    stepDefaultsInitializedRef.current.add(activeStep);
  }, [activeStep, form]);

  // Safety bootstrap for brand-new loans:
  // if lead date/time are empty (e.g. after reset/restore), auto-fill unless user already touched them.
  useEffect(() => {
    if (isEditMode) return;
    if (activeStep !== "profile") return;

    const leadDateTouched = form.isFieldTouched("leadDate");
    const leadTimeTouched = form.isFieldTouched("leadTime");

    const now = dayjs();
    const patch = {};
    if (!hasMeaningfulValue(watchedLeadDate) && !leadDateTouched) patch.leadDate = now;
    if (!hasMeaningfulValue(watchedLeadTime) && !leadTimeTouched) patch.leadTime = now;

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [isEditMode, activeStep, form, watchedLeadDate, watchedLeadTime]);

  // Notes Modal Component
  const NotesModal = ({ open, onClose }) => {
    const [notes, setNotes] = useState(() => form?.getFieldValue("loan_notes") || "");

    if (!open) return null;

    const handleSave = () => {
      form.setFieldsValue({ loan_notes: notes });
      message.success("Notes saved");
      onClose?.();
    };

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="MessageSquare" size={18} className="text-primary" />
              <div className="text-sm font-semibold text-foreground">Loan Notes</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <Icon name="X" size={18} />
            </button>
          </div>
          <div className="p-4">
            <textarea
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background min-h-[220px] focus:outline-none"
              placeholder="Add internal notes for this loan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Documents Modal Component
  const DocumentsModal = ({ open, onClose }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="FileText" size={18} className="text-primary" />
              <div className="text-sm font-semibold text-foreground">Loan Documents</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <Icon name="X" size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { title: "Customer KYC", icon: "UserCheck", count: 5, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                { title: "Bank Documents", icon: "Building", count: 3, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                { title: "Vehicle Documents", icon: "Car", count: 4, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                { title: "Approval Letters", icon: "FileCheck", count: 2, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                { title: "Disbursement Docs", icon: "CreditCard", count: 3, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
                { title: "Post-File Records", icon: "FileText", count: 6, color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
              ].map((category, idx) => (
                <div key={idx} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${category.color}`}>
                  <div className="flex items-start justify-between mb-2">
                    <Icon name={category.icon} size={20} />
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background/50">{category.count}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{category.title}</h3>
                  <p className="text-xs opacity-70">Click to view all</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">All documents are stored securely</span>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // banksData must persist across steps
  const [banksData, setBanksData] = useState([]);

  useEffect(() => {
    if (isEditMode || !freshLoanToken) return;

    const now = dayjs();
    form.resetFields();
    setBanksData([]);
    setActiveStep("profile");
    stepDefaultsInitializedRef.current = new Set();
    stepDefaultsReadyRef.current = true;
    clearSavedFormData();
    form.setFieldsValue({
      isFinanced: "Yes",
      currentStage: "profile",
      leadDate: now,
      leadTime: now,
    });
  }, [isEditMode, freshLoanToken, form, clearSavedFormData]);

  const resolveBankAmounts = useCallback((bank = {}, context = {}) => {
    const toNum = (val) => {
      const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const net = toNum(bank?.breakupNetLoanApproved);
    const credit = toNum(bank?.breakupCreditAssured);
    const ins = toNum(bank?.breakupInsuranceFinance);
    const ew = toNum(bank?.breakupEwFinance);
    const addOns = credit + ins + ew;

    const bankLoan = toNum(bank?.loanAmount);
    const bankDisbursed = toNum(bank?.disbursedAmount);
    const ctxApproved = toNum(context?.approval_loanAmountApproved);
    const ctxDisbursed = toNum(context?.approval_loanAmountDisbursed);

    const derivedApproved = net || ctxApproved || (bankLoan > addOns ? bankLoan - addOns : bankLoan) || 0;
    const derivedTotal = derivedApproved + addOns;
    const derivedDisbursed = bankDisbursed || ctxDisbursed || derivedTotal || derivedApproved;

    return {
      derivedApproved,
      derivedTotal,
      derivedDisbursed,
      net,
      credit,
      ins,
      ew,
    };
  }, []);

  const buildAutoBankCardFromApproval = useCallback((values = {}, index = 0) => {
    const bankName = String(values?.approval_bankName || "").trim();
    if (!bankName) return null;

    const toNum = (val) => {
      const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const toIso = (val) => {
      if (!val) return "";
      if (dayjs.isDayjs(val)) return val.toISOString();
      const d = dayjs(val);
      return d.isValid() ? d.toISOString() : "";
    };

    const approvedAt = toIso(values?.approval_approvalDate);
    const disbursedAt = toIso(values?.approval_disbursedDate);
    const nowIso = new Date().toISOString();
    const rawStatus = String(values?.approval_status || "").trim();
    const status =
      rawStatus || (disbursedAt ? "Disbursed" : approvedAt ? "Approved" : "Pending");
    const normalizedApprovedAt = approvedAt || disbursedAt || nowIso;
    const statusHistory = [];
    if (status === "Disbursed" || disbursedAt) {
      statusHistory.push({
        status: "Approved",
        changedAt: normalizedApprovedAt,
        date: normalizedApprovedAt,
        note: "Auto-created from approval bank fields",
      });
      statusHistory.push({
        status: "Disbursed",
        changedAt: disbursedAt || normalizedApprovedAt,
        date: disbursedAt || normalizedApprovedAt,
        note: "Auto-created from approval bank fields",
      });
    } else if (status === "Approved" || approvedAt) {
      statusHistory.push({
        status: "Approved",
        changedAt: normalizedApprovedAt,
        date: normalizedApprovedAt,
        note: "Auto-created from approval bank fields",
      });
    } else {
      statusHistory.push({
        status: "Pending",
        changedAt: nowIso,
        date: nowIso,
        note: "Auto-created from approval bank fields",
      });
    }

    return {
      id: Date.now() + index,
      bankName,
      applicationId: `ACILLP-Loan-${String(index + 1).padStart(4, "0")}`,
      status,
      loanBookedIn: values?.approval_loanBookedIn || "Direct Code",
      brokerName: values?.approval_brokerName || "",
      interestRate: String(values?.approval_roi ?? ""),
      loanAmount: toNum(values?.approval_loanAmountApproved),
      processingFee: toNum(values?.approval_processingFees),
      tenure: String(values?.approval_tenureMonths ?? ""),
      disbursedAmount: toNum(values?.approval_loanAmountDisbursed),
      approvalDate: approvedAt || undefined,
      disbursalDate: disbursedAt || undefined,
      breakupNetLoanApproved: toNum(values?.approval_breakup_netLoanApproved),
      breakupCreditAssured: toNum(values?.approval_breakup_creditAssured),
      breakupInsuranceFinance: toNum(values?.approval_breakup_insuranceFinance),
      breakupEwFinance: toNum(values?.approval_breakup_ewFinance),
      payoutPercent: values?.payoutPercentage ?? "",
      vehicle: {},
      statusHistory,
    };
  }, []);

  const normalizeApprovalSequence = useCallback((bank = {}) => {
    const currentStatus = String(bank?.status || "").trim();
    const approvalDate = bank?.approvalDate || null;
    const disbursedDate = bank?.disbursedDate || bank?.disbursalDate || null;
    const rawHistory = Array.isArray(bank?.statusHistory) ? bank.statusHistory : [];
    const hasApproved = rawHistory.some((h) => String(h?.status || "") === "Approved");
    const hasDisbursed = rawHistory.some((h) => String(h?.status || "") === "Disbursed");
    const nowIso = new Date().toISOString();
    const approvedAt = approvalDate || disbursedDate || nowIso;

    const normalizedHistory = rawHistory.map((h) => {
      const when = h?.changedAt || h?.date || nowIso;
      return { ...h, changedAt: when, date: when };
    });

    if ((currentStatus === "Disbursed" || disbursedDate) && !hasApproved) {
      normalizedHistory.unshift({
        status: "Approved",
        changedAt: approvedAt,
        date: approvedAt,
        note: "Auto-inserted to preserve approval flow",
      });
    }
    if ((currentStatus === "Disbursed" || disbursedDate) && !hasDisbursed) {
      const disbAt = disbursedDate || approvedAt;
      normalizedHistory.push({
        status: "Disbursed",
        changedAt: disbAt,
        date: disbAt,
        note: "Auto-inserted from disbursement details",
      });
    }
    if (currentStatus === "Approved" && !hasApproved) {
      normalizedHistory.push({
        status: "Approved",
        changedAt: approvedAt,
        date: approvedAt,
        note: "Auto-inserted from approval details",
      });
    }

    let normalizedStatus = currentStatus || "Pending";
    if (disbursedDate || normalizedHistory.some((h) => String(h?.status || "") === "Disbursed")) {
      normalizedStatus = "Disbursed";
    } else if (approvalDate || normalizedHistory.some((h) => String(h?.status || "") === "Approved")) {
      normalizedStatus = "Approved";
    }

    return {
      ...bank,
      status: normalizedStatus,
      statusHistory: normalizedHistory,
    };
  }, []);

  // Default to null/undefined if not set. Only strictly "Yes" enables finance sections.
  const isFinancedValue = watchedIsFinanced ?? form.getFieldValue("isFinanced");
  const isCashCase = isFinancedValue === "No";
  const showPrefileCoApplicant = Boolean(watchedHasCoApplicant);
  const showPrefileGuarantor = Boolean(watchedHasGuarantor);
  const showPrefileAuthorisedSignatory = watchedApplicantType === "Company";
  const visibleSteps = useMemo(() => {
    if (isCashCase) return ["profile", "prefile", "delivery"];
    return ["profile", "prefile", "approval", "postfile", "delivery", "payout"];
  }, [isCashCase]);
  const stepperSections = useMemo(
    () => ({
      profile: [
        { id: "lead", label: "Lead Details", visible: true },
        { id: "vehicle", label: "Vehicle Details", visible: true },
        // Cash-car profile uses personal details flow; avoid showing finance in hover.
        { id: "finance", label: "Finance Details", visible: !isCashCase },
        { id: "personal", label: "Personal Details", visible: true },
        { id: "employment", label: "Employment Details", visible: !isCashCase },
        { id: "income", label: "Income Details", visible: !isCashCase },
        { id: "bank", label: "Bank Details", visible: !isCashCase },
        { id: "references", label: "References", visible: !isCashCase },
        { id: "kyc", label: "KYC Details", visible: !isCashCase },
      ],
      prefile: [
        { id: "personal_pre", label: "Personal Details", visible: !isCashCase },
        { id: "occupational", label: "Occupational Details", visible: !isCashCase },
        { id: "income_banking", label: "Income & Banking", visible: !isCashCase },
        { id: "vehicle_loan", label: "Vehicle & Loan", visible: true },
        { id: "references", label: "References", visible: !isCashCase },
        { id: "kyc", label: "KYC Details", visible: !isCashCase },
        { id: "section7", label: "Record Details", visible: !isCashCase },
        { id: "co_applicant", label: "Co-Applicant", visible: !isCashCase && showPrefileCoApplicant },
        { id: "guarantor", label: "Guarantor", visible: !isCashCase && showPrefileGuarantor },
        {
          id: "auth_signatory",
          label: "Authorised Signatory",
          visible: !isCashCase && showPrefileAuthorisedSignatory,
        },
        { id: "bulk_loan", label: "Bulk Loan Creation", visible: !isCashCase },
      ],
      approval: [
        { id: "approval-top", label: "Bank Status" },
        { id: "approval-matrix", label: "Comparison Matrix" },
        { id: "approval-records", label: "Record Details" },
      ],
      postfile: [
        { id: "postfile_approval", label: "Approval Reconciliation" },
        { id: "postfile_vehicle", label: "Vehicle Verification" },
        { id: "postfile_instruments", label: "Instrument Controls" },
        { id: "postfile_repayment", label: "Repayment Intelligence" },
        { id: "postfile_docs", label: "Document Management" },
        { id: "postfile_dispatch", label: "Dispatch & Records" },
        { id: "postfile_docs_list", label: "Documents Ledger" },
      ],
      delivery: [
        { id: "delivery-details", label: "Delivery Details" },
        { id: "delivery-insurance", label: "Insurance Details" },
        { id: "delivery-invoice", label: "Invoice Details" },
        { id: "delivery-rc", label: "RC Details" },
      ],
      payout: [{ id: "payout-top", label: "Payout Details" }],
    }),
    [
      isCashCase,
      showPrefileAuthorisedSignatory,
      showPrefileCoApplicant,
      showPrefileGuarantor,
    ],
  );

  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const docAutoSaveReadyRef = React.useRef(false);
  const docAutoSaveSignatureRef = React.useRef("");

  // ----------------------------
  // API helpers
  // ----------------------------
  const fetchLoanById = useCallback(async (loanId) => {
    if (!loanId) return null;
    try {
      const json = await loansApi.getById(loanId);
      return json?.data || null;
    } catch (error) {
      const list = await loansApi.getAll();
      const loans = Array.isArray(list?.data) ? list.data : [];
      const matched = loans.find(
        (loan) =>
          loan?._id === loanId ||
          loan?.loanId === loanId ||
          loan?.loan_number === loanId,
      );
      if (!matched) return null;
      if (matched?._id && matched._id !== loanId) {
        try {
          const full = await loansApi.getById(matched._id);
          return full?.data || matched;
        } catch {
          return matched;
        }
      }
      return matched;
    }
  }, []);

  const createLoan = useCallback(async (payload) => {
    const json = await loansApi.create(payload);
    // Return full response so we can show customerLinked (e.g. "created from loan")
    return json || null;
  }, []);

  const updateLoan = useCallback(async (loanId, payload) => {
    const json = await loansApi.update(loanId, payload);
    return json?.data || null;
  }, []);

  // ----------------------------
  // Load existing loan (EDIT MODE)
  // ----------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!isEditMode) return;

      try {
        setLoading(true);

        // If initialData is provided (from EditLoan), use it directly
        let loan = initialData;
        
        // Otherwise fetch from API if we have loanIdFromRoute
        if (!loan && loanIdFromRoute) {
          loan = await fetchLoanById(loanIdFromRoute);
        }

        if (!mounted) return;
        loadedLoanRef.current = loan || null;

        const hydratedLoan = {
          ...(loan || {}),
          typeOfLoan: normalizeLoanTypeLabel(loan?.typeOfLoan || loan?.loanType) || loan?.typeOfLoan || "",
          occupationType: normalizeOccupationLabel(loan?.occupationType),
          co_occupation: normalizeOccupationLabel(loan?.co_occupation),
          gu_occupation: normalizeOccupationLabel(loan?.gu_occupation),
          dispatch_date:
            loan?.dispatch_date || loan?.dispatchDate || "",
          disbursement_date:
            loan?.disbursement_date || loan?.approval_disbursedDate || "",
          instrumentType:
            loan?.instrumentType ||
            (loan?.si_accountNumber ? "SI" : "") ||
            (loan?.ecs_accountNumber || loan?.ecs_bankName ? "ECS" : "") ||
            (loan?.cheque_1_number || loan?.cheque_1_bankName || loan?.cheque_1_accountNumber ? "Cheque" : ""),
          signatorySameAsCoApplicant:
            typeof loan?.signatorySameAsCoApplicant === "boolean"
              ? loan.signatorySameAsCoApplicant
              : (loan?.applicantType === "Company" && Boolean(
                  loan?.co_customerName || loan?.co_name || loan?.co_primaryMobile || loan?.co_mobile
                )),
          primaryMobile:
            loan?.primaryMobile || loan?.mobileNo || loan?.customerMobile || "",
          vehicleRegNo:
            loan?.vehicleRegNo || loan?.vehicleRegdNumber || loan?.rc_redg_no || "",
          rc_redg_no:
            loan?.rc_redg_no || loan?.vehicleRegNo || loan?.vehicleRegdNumber || "",
          co_customerName:
            loan?.co_customerName || loan?.co_name || loan?.coApplicant_name || "",
          co_primaryMobile:
            loan?.co_primaryMobile || loan?.co_mobile || loan?.coApplicant_mobile || "",
          co_currentExperience:
            loan?.co_currentExperience || loan?.co_currentExp || "",
          co_totalExperience:
            loan?.co_totalExperience || loan?.co_totalExp || "",
          co_yearsAtCurrentResidence:
            loan?.co_yearsAtCurrentResidence || loan?.co_yearsInCurrentResidence || "",
          co_houseType:
            loan?.co_houseType || loan?.houseType || "",
          co_dob:
            loan?.co_dob ||
            loan?.coApplicant?.dob ||
            loan?.co_applicant?.dob ||
            "",
          signatory_dob:
            loan?.signatory_dob ||
            loan?.signatory?.dob ||
            "",
          showroomDealerName:
            loan?.showroomDealerName || loan?.delivery_dealerName || "",
          showroomDealerContactPerson:
            loan?.showroomDealerContactPerson || loan?.delivery_dealerContactPerson || "",
          showroomDealerContactNumber:
            loan?.showroomDealerContactNumber || loan?.delivery_dealerContactNumber || "",
          showroomDealerAddress:
            loan?.showroomDealerAddress || loan?.delivery_dealerAddress || "",
          rc_inv_storage_number:
            loan?.rc_inv_storage_number || loan?.rcStorageNumber || "",
          docsPreparedBy:
            loan?.docsPreparedBy || loan?.docs_prepared_by || "",
          postfile_emiPlan:
            loan?.postfile_emiPlan || loan?.emiPlan || "",
          postfile_emiMode:
            loan?.postfile_emiMode || loan?.emiMode || "",
          reference1:
            loan?.reference1 && typeof loan.reference1 === "object"
              ? loan.reference1
              : {
                  name: loan?.reference1_name || "",
                  mobile: loan?.reference1_mobile || "",
                  address: loan?.reference1_address || "",
                  pincode: loan?.reference1_pincode || "",
                  city: loan?.reference1_city || "",
                  relation: loan?.reference1_relation || "",
                },
          reference2:
            loan?.reference2 && typeof loan.reference2 === "object"
              ? loan.reference2
              : {
                  name: loan?.reference2_name || "",
                  mobile: loan?.reference2_mobile || "",
                  address: loan?.reference2_address || "",
                  pincode: loan?.reference2_pincode || "",
                  city: loan?.reference2_city || "",
                  relation: loan?.reference2_relation || "",
                },
          companyPartners:
            Array.isArray(loan?.companyPartners) && loan.companyPartners.length
              ? loan.companyPartners.map((p) => ({
                  ...(p || {}),
                  // Partner/Director DOB field is <input type="date">, so keep YYYY-MM-DD string.
                  dateOfBirth: (() => {
                    const raw = p?.dateOfBirth || p?.dob || "";
                    if (!raw) return "";
                    const d = dayjs(raw);
                    return d.isValid() ? d.format("YYYY-MM-DD") : String(raw);
                  })(),
                }))
              : loan?.companyPartners,
        };

        const fixed = normalizeKnownDateFields(convertAnyDateToDayjsDeep(hydratedLoan));
        form.setFieldsValue(fixed);


        // Hydrate each bank in approval_banksData with vehicle/prefile fields if missing.
        // If legacy/import has only approval_bankName, auto-create one bank card.
        if (Array.isArray(loan?.approval_banksData) && loan.approval_banksData.length) {
          const vehicleFields = [
            'vehicleMake', 'vehicleModel', 'vehicleVariant', 'vehicleFuelType', 'exShowroomPrice',
            'typeOfLoan', 'onRoadPrice', 'downPayment', 'financeExpectation',
            'customerName', 'primaryMobile', 'customerEmail', 'customerPan', 'customerAadhar', 'customerAddress', 'city'
          ];
          const hydratedBanks = loan.approval_banksData.map(bank => {
            const hydrated = { ...bank };
            vehicleFields.forEach(field => {
              if (hydrated[field] === undefined && loan[field] !== undefined) {
                hydrated[field] = loan[field];
              }
            });
            const amt = resolveBankAmounts(hydrated, loan);
            hydrated.breakupNetLoanApproved = amt.net || amt.derivedApproved;
            hydrated.breakupCreditAssured = amt.credit;
            hydrated.breakupInsuranceFinance = amt.ins;
            hydrated.breakupEwFinance = amt.ew;
            hydrated.loanAmount = amt.derivedTotal || amt.derivedApproved;
            hydrated.disbursedAmount = amt.derivedDisbursed;
            hydrated.tenure = Number(hydrated.tenure) || Number(loan.approval_tenureMonths) || Number(loan.postfile_tenureMonths) || "";
            return normalizeApprovalSequence(hydrated);
          });
          setBanksData(hydratedBanks);
        } else {
          const autoBank = buildAutoBankCardFromApproval(hydratedLoan, 0);
          if (autoBank) {
            setBanksData([normalizeApprovalSequence(autoBank)]);
          }
        }

        if (loan?.currentStage) {
          setActiveStep(loan.currentStage);
        }
      } catch (e) {
        console.error("Load loan failed:", e);
        alert("Failed to load loan ❌");
      } finally {
        if (mounted) setLoading(false);
        stepDefaultsReadyRef.current = true;
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isEditMode, loanIdFromRoute, fetchLoanById, form, initialData, buildAutoBankCardFromApproval, normalizeApprovalSequence, resolveBankAmounts]);

  // Persist KYC + delivery docs immediately on edit mode so refresh doesn't lose uploads.
  useEffect(() => {
    const effectiveLoanId = loanIdFromRoute || form.getFieldValue("loanId");
    if (!isEditMode || !effectiveLoanId) return;

    const docPatch = {
      aadhaarCardDocUrl: watchedAadhaarCardDocUrl || "",
      panCardDocUrl: watchedPanCardDocUrl || "",
      passportDocUrl: watchedPassportDocUrl || "",
      dlDocUrl: watchedDlDocUrl || "",
      addressProofDocUrl: watchedAddressProofDocUrl || "",
      gstDocUrl: watchedGstDocUrl || "",
      co_aadhaarCardDocUrl: watchedCoAadhaarCardDocUrl || "",
      co_panCardDocUrl: watchedCoPanCardDocUrl || "",
      co_passportDocUrl: watchedCoPassportDocUrl || "",
      co_dlDocUrl: watchedCoDlDocUrl || "",
      co_addressProofDocUrl: watchedCoAddressProofDocUrl || "",
      gu_aadhaarCardDocUrl: watchedGuAadhaarCardDocUrl || "",
      gu_panCardDocUrl: watchedGuPanCardDocUrl || "",
      gu_passportDocUrl: watchedGuPassportDocUrl || "",
      gu_dlDocUrl: watchedGuDlDocUrl || "",
      gu_addressProofDocUrl: watchedGuAddressProofDocUrl || "",
      delivery_invoiceFile: watchedDeliveryInvoiceFile || "",
      delivery_rcFile: watchedDeliveryRcFile || "",
    };

    const signature = JSON.stringify(docPatch);
    if (!docAutoSaveReadyRef.current) {
      docAutoSaveReadyRef.current = true;
      docAutoSaveSignatureRef.current = signature;
      return;
    }
    if (signature === docAutoSaveSignatureRef.current) return;

    const timer = setTimeout(async () => {
      try {
        await loansApi.update(effectiveLoanId, docPatch);
        docAutoSaveSignatureRef.current = signature;
      } catch (error) {
        console.error("Failed to auto-persist KYC/Delivery documents:", error);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    isEditMode,
    loanIdFromRoute,
    form,
    watchedAadhaarCardDocUrl,
    watchedPanCardDocUrl,
    watchedPassportDocUrl,
    watchedDlDocUrl,
    watchedAddressProofDocUrl,
    watchedGstDocUrl,
    watchedCoAadhaarCardDocUrl,
    watchedCoPanCardDocUrl,
    watchedCoPassportDocUrl,
    watchedCoDlDocUrl,
    watchedCoAddressProofDocUrl,
    watchedGuAadhaarCardDocUrl,
    watchedGuPanCardDocUrl,
    watchedGuPassportDocUrl,
    watchedGuDlDocUrl,
    watchedGuAddressProofDocUrl,
    watchedDeliveryInvoiceFile,
    watchedDeliveryRcFile,
  ]);

  // When approval bank is available but approval_banksData is empty, auto-seed one bank card.
  useEffect(() => {
    if (banksData.length > 0) return;
    const approvalBankName = String(watchedApprovalBankName || "").trim();
    if (!approvalBankName) return;
    const snapshot = form.getFieldsValue([
      "approval_bankName",
      "approval_status",
      "approval_loanAmountApproved",
      "approval_loanAmountDisbursed",
      "approval_roi",
      "approval_tenureMonths",
      "approval_processingFees",
      "approval_approvalDate",
      "approval_disbursedDate",
      "approval_breakup_netLoanApproved",
      "approval_breakup_creditAssured",
      "approval_breakup_insuranceFinance",
      "approval_breakup_ewFinance",
      "payoutPercentage",
    ]);
    const autoBank = buildAutoBankCardFromApproval(snapshot, 0);
    if (autoBank) setBanksData([normalizeApprovalSequence(autoBank)]);
  }, [banksData.length, watchedApprovalBankName, form, buildAutoBankCardFromApproval, normalizeApprovalSequence]);

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

    const currentSnapshot = form.getFieldsValue([
      "approval_loanAmountApproved",
      "approval_loanAmountDisbursed",
      "approval_tenureMonths",
      "postfile_tenureMonths",
    ]);
    const amt = resolveBankAmounts(primaryBank, currentSnapshot);
    const resolvedTenure =
      Number(primaryBank.tenure) ||
      Number(currentSnapshot?.approval_tenureMonths) ||
      Number(currentSnapshot?.postfile_tenureMonths) ||
      undefined;

    form.setFieldsValue({
      approval_bankId: primaryBank.id,
      approval_bankName: primaryBank.bankName || "",
      approval_status: primaryBank.status || "Pending",
      approval_loanBookedIn: primaryBank.loanBookedIn || "Direct Code",
      approval_brokerName:
        (primaryBank.loanBookedIn || "Direct Code") === "Indirect Code"
          ? primaryBank.brokerName || ""
          : "",
      approval_loanAmountApproved: amt.derivedApproved,
      approval_loanAmountDisbursed: amt.derivedDisbursed,
      approval_roi: Number(primaryBank.interestRate) || undefined,
      approval_tenureMonths: resolvedTenure,
      approval_processingFees: cleanNumber(primaryBank.processingFee),
      approval_approvalDate: approvalDate ? toDayjs(approvalDate) : null,
      approval_disbursedDate: disbursedDate ? toDayjs(disbursedDate) : null,
      approval_breakup_netLoanApproved: amt.net || amt.derivedApproved,
      approval_breakup_creditAssured: amt.credit,
      approval_breakup_insuranceFinance: amt.ins,
      approval_breakup_ewFinance: amt.ew,
      dsaCode:
        (primaryBank.loanBookedIn || "Direct Code") === "Indirect Code"
          ? ""
          : primaryBank.dsaCode || "",
      payoutPercentage: primaryBank.payoutPercent || "",
    });
  }, [banksData, form, resolveBankAmounts]);

  // ----------------------------
  // Save logic (API only)
  // ----------------------------
  // Builds full payload from every section: profile, prefile, approval, postfile, delivery, payout.
  // form.getFieldsValue(true) returns all Form.Item values from the entire form.
  const buildLoanPayload = useCallback(
    (extra = {}) => {
      syncPrimaryApprovalToForm();

      const raw = {
        ...form.getFieldsValue(true),
        ...extra,
      };

      // \ud83d\udd27 FIX: Flatten nested reference objects to match backend schema
      // Backend expects: reference1_name, reference1_mobile, etc.
      // Form has: reference1: { name, mobile, ... }
      if (raw.reference1 && typeof raw.reference1 === 'object') {
        raw.reference1_name = raw.reference1.name;
        raw.reference1_mobile = raw.reference1.mobile;
        raw.reference1_address = raw.reference1.address;
        raw.reference1_pincode = raw.reference1.pincode;
        raw.reference1_city = raw.reference1.city;
        raw.reference1_relation = raw.reference1.relation;
        delete raw.reference1; // Remove nested object
      }
      
      if (raw.reference2 && typeof raw.reference2 === 'object') {
        raw.reference2_name = raw.reference2.name;
        raw.reference2_mobile = raw.reference2.mobile;
        raw.reference2_address = raw.reference2.address;
        raw.reference2_pincode = raw.reference2.pincode;
        raw.reference2_city = raw.reference2.city;
        raw.reference2_relation = raw.reference2.relation;
        delete raw.reference2; // Remove nested object
      }

      // 🧹 For submit: keep "" and false so every section's data is stored according to user feed
      const cleaned = cleanPayloadForSubmit(raw, ['_id', '__v']);

      if (cleaned.postfile_emiPlan && !cleaned.emiPlan) {
        cleaned.emiPlan = cleaned.postfile_emiPlan;
      }
      if (cleaned.postfile_emiMode && !cleaned.emiMode) {
        cleaned.emiMode = cleaned.postfile_emiMode;
      }
      if (cleaned.emiPlan && !cleaned.postfile_emiPlan) {
        cleaned.postfile_emiPlan = cleaned.emiPlan;
      }
      if (cleaned.emiMode && !cleaned.postfile_emiMode) {
        cleaned.postfile_emiMode = cleaned.emiMode;
      }

      // 🚫 DO NOT reconvert values already strings
      const sanitized = convertDatesToStringsDeep(cleaned);
      
      // Cleanup internal fields
      delete sanitized._id;
      delete sanitized.__v;
      delete sanitized.createdAt;
      delete sanitized.updatedAt;

      // Convert array fields to strings for backend compatibility
      if (Array.isArray(sanitized.companyType)) {
        sanitized.companyType = sanitized.companyType[0] || "";
      }
      if (Array.isArray(sanitized.co_companyType)) {
        sanitized.co_companyType = sanitized.co_companyType[0] || "";
      }
      if (Array.isArray(sanitized.gu_companyType)) {
        sanitized.gu_companyType = sanitized.gu_companyType[0] || "";
      }

      const normalizeFinanced = (value) => {
        const v = String(value ?? "").trim().toLowerCase();
        if (!v) return "Yes";
        if (
          v === "no" ||
          v === "n" ||
          v === "false" ||
          v === "0" ||
          v.includes("cash")
        ) {
          return "No";
        }
        if (v === "yes" || v === "y" || v === "true" || v === "1" || v.includes("finance")) {
          return "Yes";
        }
        return "Yes";
      };

      const payload = {
        ...sanitized,
        typeOfLoan: normalizeLoanTypeLabel(sanitized?.typeOfLoan) || sanitized?.typeOfLoan,
        currentStage: activeStep,
        isFinanced: normalizeFinanced(sanitized?.isFinanced),
        docsPreparedBy: sanitized?.docsPreparedBy ?? sanitized?.docs_prepared_by ?? undefined,
        docs_prepared_by: sanitized?.docs_prepared_by ?? sanitized?.docsPreparedBy ?? undefined,
        // Ensure Yes/No and Switch choices are always stored (including "No" and false)
        hasCoApplicant: Boolean(sanitized?.hasCoApplicant),
        hasGuarantor: Boolean(sanitized?.hasGuarantor),
        recordSource: sanitized?.recordSource ?? undefined,
        source: sanitized?.source ?? undefined,
        sourceName: sanitized?.sourceName ?? undefined,
        payoutApplicable: sanitized?.payoutApplicable ?? undefined,
        prefile_sourcePayoutPercentage: sanitized?.prefile_sourcePayoutPercentage ?? undefined,
        approval_banksData: banksData,
      };

      return mergeInstrumentFallback(payload, loadedLoanRef.current);
    },
    [activeStep, banksData, form, syncPrimaryApprovalToForm],
  );


  // ----------------------------
  // Helper: Sync Customer Data
  // ----------------------------
  /* =========================================================
     SYNC HELPERS (Map Loan Form -> Customer Schema)
     ========================================================= */
  const syncCustomerData = useCallback(async ({ allowCreate = true } = {}) => {
    try {
      const formValues = form.getFieldsValue(true);
      const hasIdentityPair = ({ normalizedName, normalizedMobile, normalizedPan }) =>
        Boolean(
          (normalizedName && normalizedMobile) ||
            (normalizedName && normalizedPan) ||
            (normalizedPan && normalizedMobile),
        );

      const isIdentityPairMatch = ({
        normalizedName,
        normalizedMobile,
        normalizedPan,
        customer,
        strictNameMatch = false,
      }) => {
        const customerMobile = normalizePhoneValue(customer?.primaryMobile);
        const customerPan = normalizeIdentityValue(customer?.panNumber).toUpperCase();
        const customerName = normalizeIdentityValue(customer?.customerName);

        if (strictNameMatch && normalizedName && customerName && customerName !== normalizedName) {
          return false;
        }

        const nameMobileMatch = Boolean(
          normalizedName &&
            customerName &&
            normalizedName === customerName &&
            normalizedMobile &&
            customerMobile &&
            normalizedMobile === customerMobile,
        );
        const namePanMatch = Boolean(
          normalizedName &&
            customerName &&
            normalizedName === customerName &&
            normalizedPan &&
            customerPan &&
            normalizedPan === customerPan,
        );
        const panMobileMatch = Boolean(
          normalizedPan &&
            customerPan &&
            normalizedPan === customerPan &&
            normalizedMobile &&
            customerMobile &&
            normalizedMobile === customerMobile,
        );

        return nameMobileMatch || namePanMatch || panMobileMatch;
      };

      const findExistingCustomerId = async ({ name, mobile, panNumber, existingId, respectExistingId = true, strictNameMatch = false }) => {
        if (respectExistingId && existingId) return existingId;

        const normalizedName = normalizeIdentityValue(name);
        const normalizedMobile = normalizePhoneValue(mobile);
        const normalizedPan = normalizeIdentityValue(panNumber).toUpperCase();
        if (!hasIdentityPair({ normalizedName, normalizedMobile, normalizedPan })) return null;

        const queries = [];
        if (normalizedMobile.length >= 10) queries.push(normalizedMobile);
        if (normalizedPan) queries.push(normalizedPan);
        if (normalizedName.length >= 2) queries.push(name);

        for (const query of queries) {
          try {
            const res = await customersApi.search(query);
            const matches = Array.isArray(res?.data) ? res.data : [];
            const matched = matches.find((customer) =>
              isIdentityPairMatch({
                normalizedName,
                normalizedMobile,
                normalizedPan,
                customer,
                strictNameMatch,
              }),
            );

            if (matched?._id || matched?.id) {
              return matched._id || matched.id;
            }
          } catch (searchError) {
            console.error("Customer search failed during sync:", searchError);
          }
        }

        return null;
      };

      const upsertCustomerRecord = async ({
        payload,
        name,
        mobile,
        panNumber,
        idFieldName,
        respectCurrentId = true,
        strictNameMatch = false,
      }) => {
        const currentId = form.getFieldValue(idFieldName);
        const normalizedName = normalizeIdentityValue(name);
        const normalizedMobile = normalizePhoneValue(mobile);
        const normalizedPan = normalizeIdentityValue(panNumber).toUpperCase();

        if (!hasIdentityPair({ normalizedName, normalizedMobile, normalizedPan }) && !currentId) return null;

        const cleanData = convertDatesToStringsDeep(cleanEmptyValues(payload));

        if (Array.isArray(cleanData.companyType)) {
          cleanData.companyType = cleanData.companyType[0] || "";
        }

        let matchedId = await findExistingCustomerId({
          name,
          mobile,
          panNumber,
          existingId: currentId,
          respectExistingId: respectCurrentId,
          strictNameMatch,
        });

        if (matchedId) {
          await customersApi.update(matchedId, cleanData);
          if (matchedId !== currentId) {
            form.setFieldsValue({ [idFieldName]: matchedId });
          }
          return matchedId;
        }

        if (!allowCreate || !normalizedName) return currentId || null;

        const res = await customersApi.create(cleanData);
        const newId = res?.data?._id || res?.data?.id || res?._id || res?.id;
        if (newId) {
          form.setFieldsValue({ [idFieldName]: newId });
          return newId;
        }

        return null;
      };

      const primaryPayload = {
        applicantType: formValues.applicantType || "Individual",
        customerName: formValues.customerName,
        primaryMobile: formValues.primaryMobile,
        email: formValues.email,
        emailAddress: formValues.email,
        whatsappNumber: formValues.whatsappNumber,
        sdwOf: formValues.sdwOf,
        fatherName: formValues.fatherName,
        gender: formValues.gender,
        dob: formValues.dob,
        motherName: formValues.motherName,
        contactPersonName: formValues.contactPersonName,
        contactPersonMobile: formValues.contactPersonMobile,
        sameAsCurrentAddress: formValues.sameAsCurrentAddress,

        residenceAddress: formValues.residenceAddress,
        pincode: formValues.pincode,
        city: formValues.city,
        state: formValues.state,
        yearsInCurrentHouse: formValues.yearsInCurrentHouse,
        yearsInCurrentCity: formValues.yearsInCurrentCity,
        houseType: formValues.houseType,
        permanentAddress: formValues.permanentAddress,
        permanentPincode: formValues.permanentPincode,
        permanentCity: formValues.permanentCity,
        currentAddress: formValues.currentAddress,

        education: formValues.education,
        educationOther: formValues.educationOther,
        maritalStatus: formValues.maritalStatus,
        dependents: formValues.dependents,
        extraMobiles: formValues.extraMobiles,

        nomineeName: formValues.nomineeName,
        nomineeDob: formValues.nomineeDob,
        nomineeRelation: formValues.nomineeRelation,

        occupationType: formValues.occupationType,
        employmentType: formValues.employmentType,
        professionalType: formValues.professionalType,
        companyName: formValues.companyName,
        designation: formValues.designation,
        companyPartners: formValues.companyPartners,
        companyType: formValues.companyType,
        businessNature: formValues.businessNature,
        currentExp: formValues.currentExp || formValues.experienceCurrent,
        totalExp: formValues.totalExp || formValues.totalExperience,
        experienceCurrent: formValues.experienceCurrent || formValues.currentExp,
        totalExperience: formValues.totalExperience || formValues.totalExp,
        incorporationYear: formValues.incorporationYear,
        isMSME: formValues.isMSME,

        employmentAddress: formValues.employmentAddress,
        employmentPincode: formValues.employmentPincode,
        employmentCity: formValues.employmentCity,
        employmentPhone: formValues.employmentPhone,
        companyAddress: formValues.employmentAddress || formValues.companyAddress,
        companyPincode: formValues.employmentPincode || formValues.companyPincode,
        companyCity: formValues.employmentCity || formValues.companyCity,
        companyPhone: formValues.employmentPhone || formValues.companyPhone,
        officialEmail: formValues.officialEmail,
        officeAddress: formValues.officeAddress,

        monthlyIncome: formValues.monthlyIncome,
        salaryMonthly: formValues.salaryMonthly,
        monthlySalary: formValues.monthlySalary,
        annualIncome: formValues.annualIncome,
        totalIncomeITR: formValues.totalIncomeITR,
        annualTurnover: formValues.annualTurnover,
        netProfit: formValues.netProfit,
        otherIncome: formValues.otherIncome,
        otherIncomeSource: formValues.otherIncomeSource,

        typeOfLoan: formValues.typeOfLoan,
        financeExpectation: formValues.financeExpectation,
        loanTenureMonths: formValues.loanTenureMonths,

        aadhaarNumber: formValues.aadhaarNumber,
        aadharNumber: formValues.aadhaarNumber || formValues.aadharNumber,
        panNumber: formValues.panNumber,
        passportNumber: formValues.passportNumber,
        dlNumber: formValues.dlNumber,
        gstNumber: formValues.gstNumber,
        voterId: formValues.voterId,

        aadhaarCardDocUrl: formValues.aadhaarCardDocUrl,
        panCardDocUrl: formValues.panCardDocUrl,
        passportDocUrl: formValues.passportDocUrl,
        dlDocUrl: formValues.dlDocUrl,
        gstDocUrl: formValues.gstDocUrl,
        addressProofDocUrl: formValues.addressProofDocUrl,

        bankName: formValues.bankName,
        accountNumber: formValues.accountNumber,
        ifscCode: formValues.ifscCode,
        ifsc: formValues.ifscCode || formValues.ifsc,
        branch: formValues.branch,
        accountType: formValues.accountType,
        accountSinceYears: formValues.accountSinceYears,
        openedIn: formValues.openedIn,

        reference1_name: formValues.reference1_name || formValues.reference1?.name,
        reference1_mobile: formValues.reference1_mobile || formValues.reference1?.mobile,
        reference1_address: formValues.reference1_address || formValues.reference1?.address,
        reference1_pincode: formValues.reference1_pincode || formValues.reference1?.pincode,
        reference1_city: formValues.reference1_city || formValues.reference1?.city,
        reference1_relation: formValues.reference1_relation || formValues.reference1?.relation,
        reference2_name: formValues.reference2_name || formValues.reference2?.name,
        reference2_mobile: formValues.reference2_mobile || formValues.reference2?.mobile,
        reference2_address: formValues.reference2_address || formValues.reference2?.address,
        reference2_pincode: formValues.reference2_pincode || formValues.reference2?.pincode,
        reference2_city: formValues.reference2_city || formValues.reference2?.city,
        reference2_relation: formValues.reference2_relation || formValues.reference2?.relation,

        identityProofType: formValues.identityProofType,
        identityProofNumber: formValues.identityProofNumber,
        addressProofType: formValues.addressProofType,
        addressProofNumber: formValues.addressProofNumber,
        identityProofExpiry: formValues.identityProofExpiry,
        addressType: formValues.addressType,

        customerType: formValues.customerType,
        loan_notes: formValues.loan_notes,
        kycStatus: formValues.kycStatus,
      };

      const primaryCustomerId = await upsertCustomerRecord({
        payload: primaryPayload,
        name: formValues.customerName,
        mobile: formValues.primaryMobile,
        panNumber: formValues.panNumber,
        idFieldName: "customerId",
      });

      if (formValues.hasCoApplicant) {
        const coApplicantPayload = {
          applicantType: "Individual",
          customerName: formValues.co_customerName,
          primaryMobile: formValues.co_primaryMobile,
          motherName: formValues.co_motherName,
          sdwOf: formValues.co_fatherName,
          gender: formValues.co_gender,
          dob: formValues.co_dob,
          maritalStatus: formValues.co_maritalStatus,
          dependents: formValues.co_dependents,
          education: formValues.co_education,
          houseType: formValues.co_houseType,
          residenceAddress: formValues.co_address,
          pincode: formValues.co_pincode,
          city: formValues.co_city,
          panNumber: formValues.co_pan,
          aadhaarNumber: formValues.co_aadhaar,
          occupationType: formValues.co_occupation,
          professionalType: formValues.co_professionalType,
          companyType: formValues.co_companyType,
          businessNature: formValues.co_businessNature,
          designation: formValues.co_designation,
          currentExp: formValues.co_currentExperience,
          experienceCurrent: formValues.co_currentExperience,
          totalExp: formValues.co_totalExperience,
          totalExperience: formValues.co_totalExperience,
          companyName: formValues.co_companyName,
          employmentAddress: formValues.co_companyAddress,
          employmentPincode: formValues.co_companyPincode,
          employmentCity: formValues.co_companyCity,
          employmentPhone: formValues.co_companyPhone,
          isMSME: formValues.co_isMSME,
        };

        await upsertCustomerRecord({
          payload: coApplicantPayload,
          name: formValues.co_customerName,
          mobile: formValues.co_primaryMobile,
          panNumber: formValues.co_pan,
          idFieldName: "co_id",
          respectCurrentId: false,
          strictNameMatch: true,
        });
      }

      return primaryCustomerId;
    } catch (e) {
      console.error("Failed to sync customer profile:", e);
      // Non-blocking error
    }
    return null;
  }, [form]);

  const handleSaveLoan = useCallback(
    async (shouldExit = false, extraData = {}, silent = false) => {
      try {
        if (!silent) setSaving(true);

        // 1. Sync Customer (Create/Update) - OPTIONAL, backend will auto-create if needed
        const syncedCustomerId = await syncCustomerData({
          silent,
          // Prevent background/edit saves from re-creating deleted or stale customer rows.
          allowCreate: !isEditMode && !silent,
        });
        const effectiveCustomerId = form.getFieldValue("customerId") || syncedCustomerId;
        
        // Set customerId if we have one from sync
        if (effectiveCustomerId && !form.getFieldValue("customerId")) {
          form.setFieldsValue({ customerId: effectiveCustomerId });
        }

        // 2. Build Loan Payload (includes customerName and primaryMobile for backend auto-create)
        const payload = buildLoanPayload(extraData);

        // CREATE (Fallback if accessed directly via /loans/new)
        if (!isEditMode) {
          const numberOfCars = Number(payload.numberOfCars) || 1;
          const result = await createLoan(payload);

          // BULK SUCCESS CASE
          if (numberOfCars > 1) {
             if (!silent) {
                 alert(result?.message || `Successfully created ${numberOfCars} loan applications.`);
                 navigate("/loans");
             }
             return true;
          }

          // SINGLE SUCCESS CASE (result = full API response: { loanId, data, customerLinked, message, ... })
          const loanData = result?.data || result;
          let newLoanId = result?.loanId || loanData?.loanId;
          if (!newLoanId) {
            if (result?.id || loanData?.id) newLoanId = result?.id || loanData?.id;
            else throw new Error("Loan created but loanId not returned");
          }

          form.setFieldsValue({
            loanId: newLoanId,
            createdAt: (loanData?.createdAt || result?.createdAt) || new Date().toISOString(),
          });

          // Clear cached draft after successful save
          clearSavedFormData();

          // 🔗 Clear customer-related caches so synced data shows everywhere
          localStorage.removeItem('customer_form_draft');
          localStorage.removeItem('customers_list_cache');

          if (!silent && result?.customerLinked?.createdNew) {
            message.success(
              `Loan created. Customer "${result.customerLinked.customerName || 'New'}" was created from this form and will appear in the Customer dashboard.`,
              5
            );
          }

          if (shouldExit) {
            if (!silent) navigate("/loans");
          } else {
             navigate(`/loans/edit/${newLoanId}`, { replace: true });
          }

          return true;
        }

        // UPDATE (Existing Loan)
        const loanId = loanIdFromRoute || form.getFieldValue("loanId");
        if (!loanId) throw new Error("loanId missing for update");

        await updateLoan(loanId, payload);

        // Clear cached draft after successful update
        clearSavedFormData();

        // 🔗 Clear customer-related caches so synced data shows everywhere
        localStorage.removeItem('customer_form_draft');
        localStorage.removeItem('customers_list_cache');

        if (shouldExit && !silent) navigate("/loans");
        return true;
      } catch (e) {
        console.error("Save failed:", e);
        if (!silent) alert(`Save failed ❌\n${e.message}`);
        return false;
      } finally {
        if (!silent) setSaving(false);
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
      syncCustomerData,
    ],
  );

  // ----------------------------
  // Actions
  // ----------------------------
  const handlePrint = () => window.print();

  const handleClearForm = useCallback(() => {
    const confirmed = window.confirm(
      "Clear all entered data from this form? This cannot be undone.",
    );
    if (!confirmed) return;

    form.resetFields();
    setBanksData([]);
    setActiveStep("profile");
    clearSavedFormData();

    form.setFieldsValue({
      isFinanced: "Yes",
    });

    message.success("Form cleared");
  }, [form, clearSavedFormData]);

  const handleDiscard = () => {
    if (
      window.confirm(
        "Are you sure you want to discard changes and exit? This cannot be undone.",
      )
    ) {
      navigate("/loans");
    }
  };

  const handleProcessLoan = async () => {
    const success = await handleSaveLoan(false);
    if (!success) return;

    setActiveStep("prefile");
  };

  const handleMoveToApproval = async () => {
    const success = await handleSaveLoan(false);
    if (!success) return;

    if (isCashCase) setActiveStep("delivery");
    else setActiveStep("approval");
  };

  const handleDisburseLoan = async (bankId, disbursementDate, remarks = "") => {
    try {
      const bankToDisburse = banksData.find((b) => b.id === bankId);

      if (!bankToDisburse) {
        alert("❌ Bank not found");
        return;
      }

      // Get loanId (either from form or route)
      const loanId = loanIdFromRoute || form.getFieldValue("loanId");
      if (!loanId) {
        alert("❌ Loan ID not found. Please save the loan first.");
        return;
      }

      const cleanNumber = (val) =>
        Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;

      // ✅ Calculate EMI for post-file auto-fill
      const calculateEMI = (principal, annualRate, tenureMonths) => {
        const P = Number(principal) || 0;
        const N = Number(tenureMonths) || 0;
        const R = (Number(annualRate) || 0) / 12 / 100;
        if (!P || !N || !R) return 0;
        const pow = Math.pow(1 + R, N);
        return Math.round((P * R * pow) / (pow - 1));
      };

      const loanAmount = cleanNumber(bankToDisburse.loanAmount);
      const roi = Number(bankToDisburse.interestRate) || 0;
      const tenure = Number(bankToDisburse.tenure) || 0;
      const emiAmount = calculateEMI(loanAmount, roi, tenure);

      // ✅ Call backend disbursement API
      // This will trigger calculatePayoutsOnDisbursement() on backend
      await loansApi.disburse(loanId, {
        disburseAmount: loanAmount,
        disbursedBankName: bankToDisburse.bankName || "",
        payoutPercentage: bankToDisburse.payoutPercent || 0,
        disbursedDate: new Date(disbursementDate).toISOString(),
        remarks: remarks || "",
      });

      // Now update local state AFTER successful API call
      const updatedBanks = banksData.map((bank) => {
        if (bank.id === bankId) {
          return {
            ...bank,
            status: "Disbursed",
            disbursedDate: disbursementDate,
            disbursementRemarks: remarks,
            statusHistory: [
              ...(bank.statusHistory || []),
              {
                status: "Disbursed",
                changedAt: new Date(disbursementDate).toISOString(),
                note: remarks || "Loan disbursed",
              },
            ],
          };
        }
        return bank;
      });

      setBanksData(updatedBanks);

      // ONLY set non-date fields
      form.setFieldsValue({
        approval_bankId: bankToDisburse.id,
        approval_bankName: bankToDisburse.bankName || "",
        approval_status: "Disbursed",
        approval_loanAmountApproved: loanAmount,
        approval_loanAmountDisbursed: loanAmount,
        approval_roi: roi || undefined,
        approval_tenureMonths: tenure || undefined,
        approval_processingFees: cleanNumber(bankToDisburse.processingFee),
        approval_breakup_netLoanApproved:
          bankToDisburse.breakupNetLoanApproved || 0,
        approval_breakup_creditAssured: bankToDisburse.breakupCreditAssured || 0,
        approval_breakup_insuranceFinance:
          bankToDisburse.breakupInsuranceFinance || 0,
        approval_breakup_ewFinance: bankToDisburse.breakupEwFinance || 0,
        payoutPercentage: bankToDisburse.payoutPercent || "",
        disburse_status: "Disbursed",
        disburse_bankName: bankToDisburse.bankName || "",
        disburse_remarks: remarks,
        __postfileSeeded: true,
        postfile_bankName: bankToDisburse.bankName || "",
        postfile_loanAmountApproved: loanAmount,
        postfile_loanAmountDisbursed: loanAmount,
        postfile_roi: roi || undefined,
        postfile_tenureMonths: tenure || undefined,
        postfile_processingFees: cleanNumber(bankToDisburse.processingFee),
        postfile_emiAmount: emiAmount,
        postfile_firstEmiDate: bankToDisburse.firstEmiDate || undefined,
      });

      // ✅ Save loan with disbursement details
      const success = await handleSaveLoan(false, {}, true);
      if (!success) {
        alert("⚠️ Disbursement succeeded but saving failed. Please refresh to verify.");
      }

      alert("✅ Loan disbursed successfully! Receivables have been created and saved.");
      setActiveStep("postfile");
    } catch (e) {
      console.error("❌ Disbursement failed:", e);
      alert(`❌ Disbursement failed: ${e.message}`);
    }
  };

  const handleMoveToDelivery = async () => {
    const success = await handleSaveLoan(false);
    if (success) setActiveStep("delivery");
  };

  const handleMoveToPostFile = async () => {
    const success = await handleSaveLoan(false);
    if (success) setActiveStep("postfile");
  };

  const handleMoveToPayout = async () => {
    const success = await handleSaveLoan(false);
    if (success) setActiveStep("payout");
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
          <div className="profile-workbench relative space-y-3 md:space-y-4">
            <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 bg-gradient-to-b from-sky-500/6 via-cyan-500/4 to-transparent dark:from-zinc-900 dark:via-sky-900/20 dark:to-transparent" />

            <PrefileSectionShell {...PROFILE_SECTIONS[0]} index={1}>
              <div id="lead" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                <LeadDetails />
              </div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PROFILE_SECTIONS[1]} index={2}>
              <div id="vehicle" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                <VehicleDetailsForm />
              </div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PROFILE_SECTIONS[2]} index={3}>
              <div id="finance" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                <FinanceDetailsForm />
              </div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PROFILE_SECTIONS[3]} index={4}>
              <div id="personal" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                <PersonalDetailsWithSearch
                  excludeFields={isCashCase ? true : isFinancedValue !== "Yes"}
                  cashMinimalMode={isCashCase}
                />
              </div>
            </PrefileSectionShell>

            {!isCashCase && (
              <>
                <PrefileSectionShell {...PROFILE_SECTIONS[4]} index={5}>
                  <div id="employment" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                    <EmploymentDetails />
                  </div>
                </PrefileSectionShell>

                <PrefileSectionShell {...PROFILE_SECTIONS[5]} index={6}>
                  <div id="income" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                    <IncomeDetails />
                  </div>
                </PrefileSectionShell>

                <PrefileSectionShell {...PROFILE_SECTIONS[6]} index={7}>
                  <div id="bank" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                    <BankDetails />
                  </div>
                </PrefileSectionShell>

                <PrefileSectionShell {...PROFILE_SECTIONS[7]} index={8}>
                  <div id="references" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                    <ReferenceDetails />
                  </div>
                </PrefileSectionShell>

                <PrefileSectionShell {...PROFILE_SECTIONS[8]} index={9}>
                  <div id="kyc" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                    <KycDetails />
                  </div>
                </PrefileSectionShell>
              </>
            )}
          </div>
        );

      case "prefile":
        if (isCashCase) {
          return (
            <div className="prefile-workbench prefile-elegance relative space-y-3 md:space-y-4">
              <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 bg-gradient-to-b from-sky-500/6 via-cyan-500/4 to-transparent dark:from-zinc-900 dark:via-sky-900/20 dark:to-transparent" />
              <PrefileSectionShell {...PREFILE_SECTIONS[3]} index={1}>
                <div id="vehicle_loan" className="[&_.section-header]:hidden [&_.section-header]:mb-0">
                  <VehiclePricingLoanDetails cashPrefileMode />
                </div>
              </PrefileSectionShell>
            </div>
          );
        }
        return (
          <div className="prefile-workbench prefile-elegance relative space-y-3 md:space-y-4">
            <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 bg-gradient-to-b from-sky-500/6 via-cyan-500/4 to-transparent dark:from-zinc-900 dark:via-sky-900/20 dark:to-transparent" />

            <PrefileSectionShell {...PREFILE_SECTIONS[0]} index={1}>
              <div id="personal_pre" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><PersonalDetailsPreFile /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[1]} index={2}>
              <div id="occupational" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><OccupationalDetailsPreFile /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[2]} index={3}>
              <div id="income_banking" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><IncomeBankingDetailsPreFile /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[3]} index={4}>
              <div id="vehicle_loan" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><VehiclePricingLoanDetails cashPrefileMode={false} /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[4]} index={5}>
              <div id="references" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><ReferenceDetails /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[5]} index={6}>
              <div id="kyc" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><KycDetails /></div>
            </PrefileSectionShell>

            <PrefileSectionShell {...PREFILE_SECTIONS[6]} index={7}>
              <div id="section7" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><Section7RecordDetails /></div>
            </PrefileSectionShell>

            {showPrefileCoApplicant && (
              <PrefileSectionShell {...PREFILE_SECTIONS[7]} index={8}>
                <div id="co_applicant" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><CoApplicantSection /></div>
              </PrefileSectionShell>
            )}

            {showPrefileGuarantor && (
              <PrefileSectionShell {...PREFILE_SECTIONS[8]} index={9}>
                <div id="guarantor" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><GuarantorSection /></div>
              </PrefileSectionShell>
            )}

            {showPrefileAuthorisedSignatory && (
              <PrefileSectionShell {...PREFILE_SECTIONS[9]} index={10}>
                <div id="auth_signatory" className="[&_.section-header]:hidden [&_.section-header]:mb-0"><AuthorisedSignatorySection /></div>
              </PrefileSectionShell>
            )}

            <div id="bulk_loan" className="rounded-2xl border border-dashed border-border/70 bg-card/75 p-2 dark:border-zinc-800 dark:bg-black/70">
              <BulkLoanCreationSection form={form} />
            </div>
          </div>
        );

      case "approval":
        return (
          <div className="space-y-3 md:space-y-4">
            <LoanApprovalStep
              form={form}
              banksData={banksData}
              setBanksData={setBanksData}
              onNext={() => setActiveStep("postfile")}
              loanId={loanIdFromRoute}
            />
          </div>
        );

      case "postfile":
        return (
          <div className="prefile-workbench prefile-elegance relative space-y-3 md:space-y-4">
            <PostFileStep form={form} banksData={banksData} loanId={loanIdFromRoute} isEditMode={isEditMode} />
          </div>
        );

      case "delivery":
        return (
          <StageWorkbench
            eyebrow="Delivery Desk"
            title="Track invoice, RC, insurance and vehicle handover"
            
            icon="Truck"
            tone="emerald"
          >
            <VehicleDeliveryStep form={form} />
          </StageWorkbench>
        );

      case "payout":
        return (
          <StageWorkbench
            eyebrow="Payout"
            title="Close source payout and final receivable decisions"
            description="Final payout controls, source computations and closure logic are surfaced in a cleaner payout workspace."
            icon="BadgeIndianRupee"
            tone="violet"
          >
            <PayoutSection form={form} />
          </StageWorkbench>
        );

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
      <Form.Item name="loan_number" hidden />
      <Form.Item name="customerId" hidden />
      <Form.Item name="dsaCode" hidden />
      <Form.Item name="co_id" hidden />
      <Form.Item name="signatory_id" hidden />
      <Form.Item name="co_currentExperience" hidden />
      <Form.Item name="co_totalExperience" hidden />
      <Form.Item name="co_yearsAtCurrentResidence" hidden />
      <Form.Item name="gu_id" hidden />
      <Form.Item name="customerName" hidden />
      <Form.Item name="primaryMobile" hidden />
      <Form.Item name="createdAt" hidden />
      <Form.Item name="updatedAt" hidden />
      <Form.Item name="currentStage" hidden />
      <Form.Item name="status" hidden />
      <Form.Item name="completedDate" hidden />
      <Form.Item name="loan_notes" hidden />
      <Form.Item name="showroomDealerName" hidden />
      <Form.Item name="showroomDealerContactPerson" hidden />
      <Form.Item name="showroomDealerContactNumber" hidden />
      <Form.Item name="showroomDealerAddress" hidden />
      <Form.Item name="rc_inv_storage_number" hidden />

      <Form.Item name="approval_bankId" hidden />
      <Form.Item name="approval_bankName" hidden />
      <Form.Item name="approval_status" hidden />
      <Form.Item name="approval_loanBookedIn" hidden />
      <Form.Item name="approval_brokerName" hidden />
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
      <Form.Item name="postfile_loanAmountApproved" hidden />
      <Form.Item name="postfile_loanAmountDisbursed" hidden />
      <Form.Item name="postfile_roi" hidden />
      <Form.Item name="postfile_tenureMonths" hidden />
      <Form.Item name="postfile_processingFees" hidden />
      <Form.Item name="postfile_emiAmount" hidden />
      <Form.Item name="postfile_firstEmiDate" hidden />
      <Form.Item name="postfile_maturityDate" hidden />

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

  // ----------------------------
  // Sidebar & Navigation
  // ----------------------------
  // Watch key form fields to trigger completion calculation
  const customerName = Form.useWatch("customerName", form);
  const mobileNo = Form.useWatch("mobileNo", form);
  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const loanAmount = Form.useWatch("loanAmount", form);
  const bankName = Form.useWatch("bankName", form);
  const tenure = Form.useWatch("tenure", form);
  const approvalStatus = Form.useWatch("approval_status", form);
  const postFileStatus = Form.useWatch("postFileStatus", form);
  const deliveryStatus = Form.useWatch("deliveryStatus", form);
  const payoutStatus = Form.useWatch("payoutStatus", form);

  // Calculate completed steps based on form values
  const completedSteps = useMemo(() => {
    const completed = [];
    
    // Profile stage - check if basic customer info is filled
    if (customerName && mobileNo && vehicleMake && vehicleModel) {
      completed.push('profile');
    }
    
    // Pre-file stage - check if loan details are filled
    if (loanAmount && bankName && tenure) {
      completed.push('prefile');
    }
    
    // Approval stage - check if approval status is set
    if (approvalStatus && approvalStatus !== 'Pending') {
      completed.push('approval');
    }
    
    // Post-file stage - check if post-file is marked
    if (postFileStatus === 'Completed') {
      completed.push('postfile');
    }
    
    // Delivery stage - check if delivery is completed
    if (deliveryStatus === 'Completed') {
      completed.push('delivery');
    }
    
    // Payout stage - check if payout is done
    if (!isCashCase && payoutStatus === 'Completed') {
      completed.push('payout');
    }
    
    return completed;
  }, [customerName, mobileNo, vehicleMake, vehicleModel, loanAmount, bankName, tenure, approvalStatus, postFileStatus, deliveryStatus, payoutStatus, isCashCase]);

  const handleStageClick = (stageKey) => {
    if (!visibleSteps.includes(stageKey)) return;
    setActiveStep(stageKey);
    // Optional: add smooth scroll to top when switching stages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionClick = (section) => {
    const key = section.key;
    const patterns = [
      key,
      `section-${key}`,
      `section-${key}-details`,
      `section-customer-${key}`,
      key === 'references' ? 'section-other' : null,
    ].filter(Boolean);
    
    let element = null;
    for (const id of patterns) {
      element = document.getElementById(id);
      if (element) break;
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      preserve
      style={{ margin: 0, padding: 0 }}
      onValuesChange={handleFormValuesChange}
    >
      <HiddenFields />

      {/* Two-column layout: Sidebar + Main Content */}
      <div
        className="flex flex-col md:flex-row gap-0 bg-muted/20 min-h-screen"
        style={{ maxWidth: 3000, margin: "0 auto", paddingTop: "4px" }}
      >
        {/* Sidebar Stepper - COMMENTED OUT
        <div 
          className={`hidden md:flex shrink-0 p-4 overflow-y-auto no-scrollbar transition-all duration-300 z-[90] ${
            isSidebarCollapsed ? "w-20" : "w-60"
          }`}
          style={{ position: "sticky", top: "130px", height: "calc(100vh - 130px)" }}
        >
          <LoanStepperSidebar
            currentStep={activeStep}
            completedSteps={completedSteps}
            sectionStatus={form.getFieldsValue(true)}
            onStageClick={handleStageClick}
            onSectionClick={handleSectionClick}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isFinanced={isFinancedValue}
            loanType={Form.useWatch("typeOfLoan", form)}
          />
        </div>
        */}

        {/* Main Form Content */}
        <div className="flex-1 min-w-0 bg-background dark:bg-black md:mb-4 md:mr-4 md:rounded-3xl border-x md:border border-border shadow-sm flex flex-col min-h-screen">
          <LoanStickyHeader
            title={headerTitle}
            activeStep={activeStep}
            onStepChange={handleStageClick}
            isFinanced={isFinancedValue}
            form={form}
            isDisbursed={form?.getFieldValue("approval_status") === "Disbursed"}
            onSave={() => handleSaveLoan(false)}
            onExit={() => handleSaveLoan(true)}
            saving={saving}
            isCollapsed={isSidebarCollapsed}
            onCollapseToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            autoSaveStatus={autoSaveStatus}
          />

          {/* Form Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div
              className={`px-3 md:px-8 bg-[linear-gradient(180deg,rgba(56,189,248,0.12)_0px,rgba(16,185,129,0.08)_56px,rgba(255,255,255,0)_130px)] dark:bg-[linear-gradient(180deg,rgba(14,116,144,0.22)_0px,rgba(4,120,87,0.14)_56px,rgba(2,6,23,0)_130px)] ${
                activeStep === "prefile" ? "pt-14 pb-4 md:pt-16 md:pb-6" : "pt-14 pb-10 md:pt-16 md:pb-14"
              }`}
            >
              <div className="w-full space-y-1">
                {renderStep()}
              </div>
            </div>
          </div>

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
            onClearForm={handleClearForm}
            onProcessLoan={handleProcessLoan}
            onMoveToApproval={handleMoveToApproval}
            onDisburseLoan={handleDisburseLoan}
            onMoveToPostFile={handleMoveToPostFile}
            onMoveToDelivery={handleMoveToDelivery}
            onMoveToPayout={handleMoveToPayout}
            onCloseLead={handleCloseLead}
            approvedBanks={banksData.filter((b) => b.status === "Approved")}
            hasDisbursed={banksData.some((b) => b.status === "Disbursed")}
            form={form}
          />
        </div>
      </div>
      {saving && (
        <div className="fixed bottom-20 right-4 z-[950] bg-card border border-border rounded-xl px-3 py-2 shadow-elevation-2 text-xs text-muted-foreground">
          Saving...
        </div>
      )}

      {/* Quick Actions Floating Toolbar - All Steps */}
      <div className="fixed bottom-20 md:bottom-24 left-1/2 transform -translate-x-1/2 z-[940] flex items-center gap-1.5 md:gap-2 p-2.5 md:p-3 bg-card dark:bg-black/90 border border-border rounded-2xl shadow-elevation-4 backdrop-blur-sm w-[calc(100%-1rem)] md:w-auto max-w-[960px] overflow-visible">
        {visibleSteps.map((step, index) => {
        // Accurate display names for steps
        const stepDisplayNames = {
          profile: "Profile",
          prefile: "Pre-File",
          approval: "Approval",
          postfile: "Post-File",
          delivery: "Delivery",
          payout: "Payout",
        };
        const stepIcons = {
          profile: "User",
          prefile: "ClipboardList",
          approval: "BadgeCheck",
          postfile: "Files",
          delivery: "Truck",
          payout: "Wallet",
        };

        const sections = (stepperSections[step] || []).filter(
          (section) => section.visible !== false,
        );
        return (
          <React.Fragment key={step}>
            {index > 0 && <div className="w-px h-6 bg-border/30" />}
            <div className="relative group/stepnav">
              <button
                type="button"
                onClick={() => setActiveStep(step)}
                className={`inline-flex items-center gap-1.5 text-[11px] md:text-xs font-medium px-2 py-1 rounded-lg transition-colors duration-150 whitespace-nowrap ${
                  activeStep === step
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon name={stepIcons[step] || "Circle"} size={12} />
                {stepDisplayNames[step] || step.charAt(0).toUpperCase() + step.slice(1)}
              </button>
              {/* Dropdown menu on hover - now stays open on dropdown hover */}
              {sections.length > 0 && (
                <div
                  className="step-dropdown absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 opacity-0 invisible group-hover/stepnav:opacity-100 group-hover/stepnav:visible group-focus-within/stepnav:opacity-100 group-focus-within/stepnav:visible transition-[opacity,transform,visibility] duration-150"
                >
                  <div className="bg-card border border-border rounded-xl shadow-elevation-3 p-2 min-w-[180px] max-h-[400px] overflow-y-auto">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setActiveStep(step);
                          setTimeout(() => {
                            const element = document.getElementById(section.id);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-muted/50 text-foreground hover:text-primary transition-colors"
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
      </div>
    </Form>
  );
};

export default LoanFormWithSteps;
