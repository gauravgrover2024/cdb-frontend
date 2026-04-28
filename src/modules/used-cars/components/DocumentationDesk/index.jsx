import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Progress,
  Radio,
  Select,
  Tag,
  TimePicker,
  Tooltip,
  Upload,
  message,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Banknote,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  Clock3,
  DollarSign,
  Eye,
  FileCheck2,
  FileText,
  GalleryVertical,
  Landmark,
  LockKeyhole,
  PencilLine,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  ADDITIONAL_SERVICE_OPTS,
  DOCUMENTATION_STORAGE_KEY,
  HOLDBACK_CONDITION_OPTS,
  INSURANCE_TYPE_OPTS,
  OWNERSHIP_TYPE_OPTS,
  PROCUREMENT_CATEGORY_OPTS,
  RC_TYPE_OPTS,
  VEHICLE_CATEGORY_OPTS,
  getDefaultDocValues,
} from "./constants";
import { BGC_STORAGE_KEY } from "../BackgroundCheckDesk/constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";
import AgreementPreview from "./AgreementPreview";

const { TextArea } = Input;

const FONT_VARS = {
  "--default-font-family":
    '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  "--default-mono-font-family":
    '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const HANDOFF_OPTIONS = [
  "RC original collected",
  "Spare key collected",
  "Insurance copy collected",
  "Service book collected",
  "PAN copy collected",
  "Aadhaar copy collected",
  "NOC / Form 35 collected",
  "Delivery photos completed",
];

const DOC_SECTIONS = [
  {
    key: "identity",
    short: "Seller",
    title: "Seller Identity",
    eyebrow: "Legal owner",
    icon: UserRound,
    color: "#6366f1",
    soft: "#eef2ff",
    description:
      "Name, contact and address exactly as the agreement should print.",
  },
  {
    key: "vehicle",
    short: "Vehicle",
    title: "Vehicle Details",
    eyebrow: "Car identity",
    icon: Car,
    color: "#0ea5e9",
    soft: "#e0f2fe",
    description:
      "Registration, engine, chassis, insurance and ownership fields.",
  },
  {
    key: "pricing",
    short: "Deal",
    title: "Commercial Terms",
    eyebrow: "Settlement sheet",
    icon: Banknote,
    color: "#10b981",
    soft: "#ecfdf5",
    description: "Price, deductions, holdbacks, token and balance transfer.",
  },
  {
    key: "banking",
    short: "KYC",
    title: "Bank, Loan & KYC",
    eyebrow: "Payout ready",
    icon: Landmark,
    color: "#f59e0b",
    soft: "#fffbeb",
    description: "Receiver account, hypothecation, challans and proof uploads.",
  },
  {
    key: "review",
    short: "Review",
    title: "Agreement Handoff",
    eyebrow: "Final lock",
    icon: FileCheck2,
    color: "#8b5cf6",
    soft: "#f5f3ff",
    description:
      "Agreement date, delivery time, handoff checklist and final unlock.",
  },
];

const loanStatusOptions = [
  { value: "Paid", label: "Paid" },
  { value: "Open", label: "Open" },
];

const balanceStatusOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Ready", label: "Ready" },
  { value: "Transferred", label: "Transferred" },
];

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const normalizeDocValues = (values = {}) => ({
  ...values,
  holdbackCondition: ensureArray(values.holdbackCondition),
  additionalServices: ensureArray(values.additionalServices),
  handoffChecklist: ensureArray(values.handoffChecklist),
});

const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const fmtCompactMoney = (value) => {
  const num = Number(value || 0);
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  return fmtMoney(num);
};

const formatCurrencyInput = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

const parseCurrencyInput = (value) =>
  String(value || "")
    .replaceAll("₹", "")
    .replaceAll(",", "")
    .trim();

function buildInitialValues(selectedLead) {
  const defaults = getDefaultDocValues(selectedLead);
  const bgc = selectedLead?.bgcData || {};

  return normalizeDocValues({
    ...defaults,
    challanAmount: defaults.challanAmount || Number(bgc.echallanAmount || 0),
    vahanChallanAmount:
      defaults.vahanChallanAmount || Number(bgc.dtpAmount || 0),
  });
}

function getMissingItems(formValues = {}) {
  const missing = {
    identity: [],
    vehicle: [],
    pricing: [],
    banking: [],
    review: [],
  };

  if (!formValues.customerName) missing.identity.push("Owner full name");
  if (!formValues.fathersName) missing.identity.push("Father / spouse name");
  if (!formValues.contactNo) missing.identity.push("Contact number");
  if (!formValues.address) missing.identity.push("Permanent address");

  if (!formValues.regNo) missing.vehicle.push("Registration number");
  if (!formValues.engineNo) missing.vehicle.push("Engine number");
  if (!formValues.chassisNo) missing.vehicle.push("Chassis number");
  if (!formValues.odometer) missing.vehicle.push("Odometer reading");

  if (Number(formValues.vehiclePrice || 0) <= 0)
    missing.pricing.push("Vehicle price");
  if (
    formValues.holdbackDays === undefined ||
    formValues.holdbackDays === null
  ) {
    missing.pricing.push("Holdback days");
  }
  if (!formValues.balanceStatus) missing.pricing.push("Balance status");

  if (!formValues.accHolderName) missing.banking.push("Account holder name");
  if (!formValues.accountNo) missing.banking.push("Account number");
  if (!formValues.bankName) missing.banking.push("Bank name");
  if (!formValues.ifsc) missing.banking.push("IFSC code");
  if (!formValues.panNo) missing.banking.push("PAN number");
  if (!formValues.aadhaarNo) missing.banking.push("Aadhaar number");

  if (!formValues.agreementDate) missing.review.push("Agreement date");
  if (!formValues.deliveryTime) missing.review.push("Delivery time");
  if (!ensureArray(formValues.handoffChecklist).length) {
    missing.review.push("Handoff checklist");
  }

  return missing;
}

function FieldShell({ children }) {
  return <div className="min-w-0">{children}</div>;
}

function MetricCard({ icon: Icon, title, value, subtitle, color, active }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className="relative overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition-all"
      style={{
        borderColor: active ? `${color}55` : "#e2e8f0",
        boxShadow: active
          ? `0 10px 28px ${color}1f`
          : "0 1px 3px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        className="absolute -right-7 -top-7 h-20 w-20 rounded-full blur-2xl"
        style={{ background: `${color}18` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${color}12`, color }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p
              className="truncate text-[18px] font-black leading-none tracking-[-0.05em]"
              style={{ color }}
            >
              {value}
            </p>
            {subtitle ? (
              <span className="truncate text-[10px] font-bold text-slate-400">
                {subtitle}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FilterChip({ label, count, active, onClick, color, icon: Icon }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-xl border-2 transition-all"
      style={{
        background: active ? "#0f172a" : "#ffffff",
        borderColor: active ? "#0f172a" : "#e2e8f0",
        boxShadow: active ? "0 8px 18px rgba(15, 23, 42, 0.16)" : "none",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {Icon ? (
          <Icon size={14} style={{ color: active ? "#fff" : color }} />
        ) : null}
        <span
          className="text-[12px] font-black"
          style={{ color: active ? "#fff" : "#334155" }}
        >
          {label}
        </span>
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-black"
          style={{
            background: active ? "rgba(255,255,255,0.20)" : `${color}14`,
            color: active ? "#fff" : color,
          }}
        >
          {count}
        </span>
      </div>
    </motion.button>
  );
}

function LeadCard({
  lead,
  active,
  verified,
  onClick,
  readiness = 0,
  missing = 0,
}) {
  const statusColor = verified ? "#10b981" : missing ? "#f59e0b" : "#0ea5e9";

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border bg-white text-left transition-all"
      style={{
        borderColor: active ? "#7dd3fc" : "#e2e8f0",
        boxShadow: active
          ? "0 10px 30px rgba(14, 165, 233, 0.16)"
          : "0 1px 3px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: statusColor }}
      />
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-sky-100 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="relative p-3.5 pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
              style={{ fontFamily: "var(--default-mono-font-family)" }}
            >
              {lead?.regNo || "NA"}
            </p>
            <p className="mt-1 truncate text-sm font-black tracking-[-0.02em] text-slate-950">
              {lead?.name || "Unnamed lead"}
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
              {[lead?.make, lead?.model].filter(Boolean).join(" ") || "Vehicle"}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
            style={{ background: `${statusColor}14`, color: statusColor }}
          >
            {verified ? "Done" : `${missing} miss`}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readiness}%` }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${statusColor}, #38bdf8)`,
              }}
            />
          </div>
          <span className="text-[10px] font-black tabular-nums text-slate-500">
            {readiness}%
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function DealIntelligenceCard({
  selectedLead,
  formValues,
  bgcSummary,
  netPayable,
  deliveryBalance,
  totalUploads,
  completionPercent,
  missingCount,
}) {
  const challanTone = bgcSummary.totalAmount > 0 ? "#ef4444" : "#10b981";
  const agreementTone = formValues?.isVerified
    ? "#10b981"
    : missingCount
      ? "#f59e0b"
      : "#0ea5e9";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{ borderColor: "#dbe3ee" }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: agreementTone }}
      />
      <div className="border-b border-slate-100 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em]"
                style={{
                  background: `${agreementTone}12`,
                  color: agreementTone,
                }}
              >
                {formValues?.isVerified ? "Agreement Ready" : "Closing Desk"}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                {selectedLead?.regNo || "No Reg"}
              </span>
            </div>
            <h1 className="mt-3 truncate text-3xl font-black tracking-[-0.055em] text-slate-950">
              {selectedLead?.name || "Member Profile"}
            </h1>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              {[selectedLead?.make, selectedLead?.model, selectedLead?.variant]
                .filter(Boolean)
                .join(" ") || "Vehicle details pending"}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[430px]">
            <MetricCard
              icon={Activity}
              title="Readiness"
              value={`${completionPercent}%`}
              subtitle={`${missingCount} missing`}
              color="#0ea5e9"
              active={completionPercent >= 80}
            />
            <MetricCard
              icon={DollarSign}
              title="Net Payable"
              value={fmtCompactMoney(netPayable)}
              subtitle="seller payout"
              color="#10b981"
              active
            />
            <MetricCard
              icon={AlertCircle}
              title="BGC Dues"
              value={fmtCompactMoney(bgcSummary.totalAmount)}
              subtitle={bgcSummary.hasPending ? "liability" : "clear"}
              color={challanTone}
              active={bgcSummary.totalAmount > 0}
            />
            <MetricCard
              icon={GalleryVertical}
              title="Uploads"
              value={`${totalUploads}/5`}
              subtitle="docs"
              color="#8b5cf6"
              active={totalUploads >= 3}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4">
        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <UserRound size={12} /> Seller
          </div>
          <p className="mt-2 truncate text-sm font-black text-slate-950">
            {formValues?.customerName || selectedLead?.name || "Not added"}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Phone size={12} /> {formValues?.contactNo || "Contact pending"}
          </div>
        </div>

        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Car size={12} /> Vehicle
          </div>
          <p className="mt-2 truncate text-sm font-black text-slate-950">
            {[formValues?.make, formValues?.model].filter(Boolean).join(" ") ||
              "Not added"}
          </p>
          <p
            className="mt-2 text-xs font-semibold text-slate-500"
            style={{ fontFamily: "var(--default-mono-font-family)" }}
          >
            {formValues?.regNo || "Reg no pending"}
          </p>
        </div>

        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Banknote size={12} /> Settlement
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">
            Balance {fmtMoney(deliveryBalance)}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Status: {formValues?.balanceStatus || "Pending"}
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Shield size={12} /> Risk
          </div>
          <p className="mt-2 text-sm font-black" style={{ color: challanTone }}>
            {bgcSummary.totalAmount > 0
              ? fmtMoney(bgcSummary.totalAmount)
              : "Clear"}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Holdback {fmtMoney(formValues?.holdbackAmount)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({
  section,
  openSection,
  setOpenSection,
  missing,
  ready,
  children,
}) {
  const Icon = section.icon;
  const isOpen = openSection === section.key;

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{
        borderColor: isOpen ? `${section.color}66` : "#e2e8f0",
        boxShadow: isOpen
          ? `0 12px 30px ${section.color}12`
          : "0 1px 3px rgba(15,23,42,0.05)",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: ready ? "#10b981" : section.color }}
      />
      <button
        type="button"
        onClick={() => setOpenSection(isOpen ? "" : section.key)}
        className="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between md:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: ready ? "#ecfdf5" : section.soft,
              color: ready ? "#10b981" : section.color,
            }}
          >
            {ready ? <CheckCircle size={20} /> : <Icon size={20} />}
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: section.color }}
            >
              {section.eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
              {section.title}
            </h3>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
              {missing.length
                ? `Missing: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}`
                : section.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tag
            className="!m-0 !rounded-full !border-0 !px-3 !py-1 !text-[10px] !font-black"
            style={{
              background: ready
                ? "#ecfdf5"
                : missing.length
                  ? "#fffbeb"
                  : "#f8fafc",
              color: ready ? "#047857" : missing.length ? "#b45309" : "#475569",
            }}
          >
            {ready ? "Ready" : `${missing.length} missing`}
          </Tag>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
          >
            <ChevronDown size={16} className="text-slate-400" />
          </motion.span>
        </div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="border-t border-slate-100 p-4 md:p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function MissingAssistant({ missingItems, setOpenSection }) {
  const entries = DOC_SECTIONS.map((section) => ({
    ...section,
    missing: missingItems[section.key] || [],
  })).filter((section) => section.missing.length > 0);

  if (!entries.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-800">
              Agreement pack is ready
            </p>
            <p className="text-xs font-semibold text-emerald-700/80">
              All required sections look complete. Verify and generate the
              agreement.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-900">
              {entries.reduce(
                (sum, section) => sum + section.missing.length,
                0,
              )}{" "}
              items blocking agreement readiness
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-800/80">
              Jump to the exact section and close the missing documents fast.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map((section) => (
            <motion.button
              key={section.key}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() => setOpenSection(section.key)}
              className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-black shadow-sm transition"
              style={{
                borderColor: `${section.color}33`,
                color: section.color,
              }}
            >
              {section.short}: {section.missing.length}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function UploadTile({
  label,
  icon: Icon,
  uploaded,
  onUpload,
  disabled,
  note,
  required,
}) {
  const color = uploaded ? "#10b981" : required ? "#f59e0b" : "#64748b";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-4 rounded-2xl border p-4 transition-all"
      style={{
        borderColor: `${color}33`,
        background: uploaded ? "#ecfdf5" : required ? "#fffbeb" : "#f8fafc",
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "#ffffff", color }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{label}</p>
        <p className="text-xs font-medium text-slate-500">
          {uploaded ? "Uploaded" : note || "JPG / PDF · max 5MB"}
        </p>
      </div>
      <Upload
        showUploadList={false}
        beforeUpload={() => {
          onUpload();
          return false;
        }}
        disabled={disabled}
      >
        <Button
          size="small"
          className="!h-9 !rounded-xl !border-slate-200 !bg-white !px-4 !font-bold !text-slate-700"
        >
          {uploaded ? "Replace" : "Upload"}
        </Button>
      </Upload>
    </motion.div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-right text-sm font-black text-slate-950">
        {value || "—"}
      </p>
    </div>
  );
}

function MiniPanel({ eyebrow, title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
          <h4 className="text-base font-black tracking-[-0.03em] text-slate-950">
            {title}
          </h4>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DocumentationDesk() {
  const [docForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [openSection, setOpenSection] = useState("identity");
  const [leadFilter, setLeadFilter] = useState("all");

  useEffect(() => {
    const existing = document.getElementById("documentation-desk-inter-font");
    if (existing) return;

    const link = document.createElement("link");
    link.id = "documentation-desk-inter-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  const leads = useMemo(() => {
    const raw = localStorage.getItem(BGC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }, []);

  useEffect(() => {
    if (leads.length > 0 && !selectedId) {
      setSelectedId(leads[0].id);
    }
  }, [leads, selectedId]);

  const selectedLead = useMemo(
    () => leads.find((item) => item.id === selectedId),
    [leads, selectedId],
  );

  const watchedValues = Form.useWatch([], docForm);
  const formValues = normalizeDocValues(
    watchedValues || buildInitialValues(selectedLead),
  );

  const bgcSummary = useMemo(() => {
    const bgc = selectedLead?.bgcData || {};
    const echallanAmount = Number(bgc.echallanAmount || 0);
    const dtpAmount = Number(bgc.dtpAmount || 0);

    return {
      hasPending: bgc.challanPending === "Yes",
      echallanAmount,
      dtpAmount,
      totalAmount: echallanAmount + dtpAmount,
    };
  }, [selectedLead]);

  const leadStatuses = useMemo(() => {
    const map = {};
    leads.forEach((lead) => {
      const saved = localStorage.getItem(
        `${DOCUMENTATION_STORAGE_KEY}_${lead.id}`,
      );
      if (saved) {
        try {
          map[lead.id] = !!JSON.parse(saved).isVerified;
        } catch {
          map[lead.id] = false;
        }
      }
    });
    return map;
  }, [leads, formValues?.isVerified]);

  const leadReadiness = useMemo(() => {
    const map = {};
    leads.forEach((lead) => {
      const saved = localStorage.getItem(
        `${DOCUMENTATION_STORAGE_KEY}_${lead.id}`,
      );
      const values = saved
        ? normalizeDocValues(JSON.parse(saved))
        : buildInitialValues(lead);
      const missing = getMissingItems(values);
      const miss = Object.values(missing).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );
      const readySections =
        DOC_SECTIONS.length -
        Object.values(missing).filter((arr) => arr.length > 0).length;
      map[lead.id] = {
        missing: miss,
        readiness: Math.round((readySections / DOC_SECTIONS.length) * 100),
      };
    });
    return map;
  }, [leads, formValues?.isVerified]);

  useEffect(() => {
    if (!selectedId) return;

    const saved = localStorage.getItem(
      `${DOCUMENTATION_STORAGE_KEY}_${selectedId}`,
    );
    const seeded = buildInitialValues(selectedLead);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = normalizeDocValues({ ...seeded, ...parsed });

        if (merged.agreementDate)
          merged.agreementDate = dayjs(merged.agreementDate);
        if (merged.deliveryTime)
          merged.deliveryTime = dayjs(merged.deliveryTime);

        docForm.resetFields();
        docForm.setFieldsValue(merged);
        setOpenSection(merged.isVerified ? "review" : "identity");
      } catch {
        docForm.resetFields();
        docForm.setFieldsValue(seeded);
        setOpenSection("identity");
      }
    } else {
      docForm.resetFields();
      docForm.setFieldsValue(seeded);
      setOpenSection("identity");
    }
  }, [selectedId, docForm, selectedLead]);

  const handleValuesChange = useCallback(
    (_, allValues) => {
      if (!selectedId) return;
      const normalized = normalizeDocValues(allValues);
      localStorage.setItem(
        `${DOCUMENTATION_STORAGE_KEY}_${selectedId}`,
        JSON.stringify(normalized),
      );
    },
    [selectedId],
  );

  const persistCurrent = useCallback(() => {
    const current = normalizeDocValues(docForm.getFieldsValue());
    handleValuesChange(null, current);
  }, [docForm, handleValuesChange]);

  const totalUploads = [
    formValues?.panAttested,
    formValues?.aadhaarAttested,
    formValues?.photoUploaded,
    formValues?.gstUploaded,
    formValues?.foreclosureStatement,
  ].filter(Boolean).length;

  const completion = useMemo(() => {
    const identityReady =
      !!formValues?.customerName &&
      !!formValues?.fathersName &&
      !!formValues?.contactNo &&
      !!formValues?.address;

    const vehicleReady =
      !!formValues?.regNo &&
      !!formValues?.engineNo &&
      !!formValues?.chassisNo &&
      !!formValues?.odometer;

    const pricingReady =
      Number(formValues?.vehiclePrice || 0) > 0 &&
      formValues?.holdbackDays !== undefined &&
      !!formValues?.balanceStatus;

    const bankReady =
      !!formValues?.accHolderName &&
      !!formValues?.accountNo &&
      !!formValues?.bankName &&
      !!formValues?.ifsc &&
      !!formValues?.panNo &&
      !!formValues?.aadhaarNo;

    const reviewReady =
      !!formValues?.agreementDate &&
      !!formValues?.deliveryTime &&
      (formValues?.handoffChecklist || []).length > 0;

    return {
      identityReady,
      vehicleReady,
      pricingReady,
      bankReady,
      reviewReady,
    };
  }, [formValues]);

  const sectionReady = {
    identity: completion.identityReady,
    vehicle: completion.vehicleReady,
    pricing: completion.pricingReady,
    banking: completion.bankReady,
    review: completion.reviewReady,
  };

  const missingItems = useMemo(() => getMissingItems(formValues), [formValues]);
  const missingCount = Object.values(missingItems).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const readyCount = Object.values(completion).filter(Boolean).length;
  const completionPercent = Math.round(
    (readyCount / DOC_SECTIONS.length) * 100,
  );

  const netPayable =
    Number(formValues?.vehiclePrice || 0) -
    Number(formValues?.feesByUser || 0) -
    Number(formValues?.holdbackAmount || 0);

  const deliveryBalance = netPayable - Number(formValues?.tokenAmount || 0);

  const leadFilterCounts = useMemo(() => {
    const all = leads.length;
    const ready = leads.filter((lead) => leadStatuses[lead.id]).length;
    const pending = all - ready;
    const risk = leads.filter((lead) => {
      const bgc = lead?.bgcData || {};
      return Number(bgc.echallanAmount || 0) + Number(bgc.dtpAmount || 0) > 0;
    }).length;
    return { all, ready, pending, risk };
  }, [leads, leadStatuses]);

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase().trim();
    return leads.filter((lead) => {
      if (leadFilter === "ready" && !leadStatuses[lead.id]) return false;
      if (leadFilter === "pending" && leadStatuses[lead.id]) return false;
      if (leadFilter === "risk") {
        const bgc = lead?.bgcData || {};
        const dues =
          Number(bgc.echallanAmount || 0) + Number(bgc.dtpAmount || 0);
        if (dues <= 0) return false;
      }
      if (!s) return true;
      return (
        (lead?.regNo || "").toLowerCase().includes(s) ||
        (lead?.name || "").toLowerCase().includes(s) ||
        (lead?.make || "").toLowerCase().includes(s) ||
        (lead?.model || "").toLowerCase().includes(s)
      );
    });
  }, [leadFilter, leadStatuses, leads, search]);

  const saveDraft = () => {
    persistCurrent();
    message.success("Draft saved.");
  };

  const handleFinalize = async () => {
    try {
      await docForm.validateFields([
        "customerName",
        "fathersName",
        "contactNo",
        "address",
        "engineNo",
        "chassisNo",
        "odometer",
        "panNo",
        "aadhaarNo",
        "agreementDate",
        "deliveryTime",
      ]);

      const values = normalizeDocValues({
        ...docForm.getFieldsValue(),
        isVerified: true,
      });

      docForm.setFieldsValue(values);
      localStorage.setItem(
        `${DOCUMENTATION_STORAGE_KEY}_${selectedId}`,
        JSON.stringify(values),
      );
      setOpenSection("review");
      message.success(
        "Documentation verified. Agreement builder is now ready.",
      );
    } catch {
      message.error("Please complete the required fields before verification.");
    }
  };

  const handleUnlock = () => {
    const values = normalizeDocValues({
      ...docForm.getFieldsValue(),
      isVerified: false,
    });

    docForm.setFieldsValue(values);
    localStorage.setItem(
      `${DOCUMENTATION_STORAGE_KEY}_${selectedId}`,
      JSON.stringify(values),
    );
    message.info("Documentation unlocked for editing.");
  };

  const openPreview = async () => {
    try {
      await docForm.validateFields(["agreementDate", "deliveryTime"]);
      setShowPreview(true);
    } catch {
      message.error("Please add agreement date and delivery time first.");
    }
  };

  if (!selectedId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10">
        <Empty description="No documents pending..." />
      </div>
    );
  }

  const renderIdentitySection = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <FieldShell>
        <Form.Item label="Owner Full Name" name="customerName">
          <Input disabled={formValues?.isVerified} />
        </Form.Item>
      </FieldShell>

      <FieldShell>
        <Form.Item
          label="Father's / Spouse Name"
          name="fathersName"
          rules={[
            { required: true, message: "Please enter father's / spouse name" },
          ]}
        >
          <Input
            placeholder="As per PAN / Aadhaar"
            disabled={formValues?.isVerified}
          />
        </Form.Item>
      </FieldShell>

      <FieldShell>
        <Form.Item
          label="Contact No."
          name="contactNo"
          rules={[{ required: true, message: "Please enter contact number" }]}
        >
          <Input disabled={formValues?.isVerified} />
        </Form.Item>
      </FieldShell>

      <FieldShell>
        <Form.Item label="Email ID" name="emailId">
          <Input disabled={formValues?.isVerified} />
        </Form.Item>
      </FieldShell>

      <div className="md:col-span-2">
        <Form.Item
          label="Full Permanent Address"
          name="address"
          rules={[{ required: true, message: "Please enter address" }]}
        >
          <TextArea rows={4} disabled={formValues?.isVerified} />
        </Form.Item>
      </div>

      <div className="md:col-span-2">
        <Form.Item label="Is this a Death Case?" name="isDeathCase">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            disabled={formValues?.isVerified}
          >
            <Radio.Button value="No">No</Radio.Button>
            <Radio.Button value="Yes">Yes</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </div>
    </div>
  );

  const renderVehicleSection = () => (
    <div className="grid gap-4 md:grid-cols-3">
      <Form.Item label="Reg No" name="regNo">
        <Input disabled />
      </Form.Item>
      <Form.Item
        label="Engine No"
        name="engineNo"
        rules={[{ required: true, message: "Please enter engine number" }]}
      >
        <Input
          placeholder="Enter full engine no."
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item
        label="Chassis No"
        name="chassisNo"
        rules={[{ required: true, message: "Please enter chassis number" }]}
      >
        <Input
          placeholder="Enter full chassis no."
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item label="Make" name="make">
        <Input disabled={formValues?.isVerified} />
      </Form.Item>
      <Form.Item label="Model" name="model">
        <Input disabled={formValues?.isVerified} />
      </Form.Item>
      <Form.Item label="Mfg Year" name="mfgYear">
        <Input disabled={formValues?.isVerified} />
      </Form.Item>
      <Form.Item label="Ownership Serial" name="ownershipSerial">
        <Select
          options={OWNERSHIP_TYPE_OPTS.map((v) => ({ value: v, label: v }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item
        label="Odometer Reading (KM)"
        name="odometer"
        rules={[{ required: true, message: "Please enter odometer" }]}
      >
        <InputNumber className="!w-full" disabled={formValues?.isVerified} />
      </Form.Item>
      <Form.Item label="Vehicle Category" name="vehicleCategory">
        <Select
          options={VEHICLE_CATEGORY_OPTS.map((v) => ({ value: v, label: v }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item label="Ownership Type" name="ownershipType">
        <Select
          options={OWNERSHIP_TYPE_OPTS.map((v) => ({ value: v, label: v }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item label="Insurance Type" name="insuranceType">
        <Select
          options={INSURANCE_TYPE_OPTS.map((v) => ({ value: v, label: v }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item label="RC Type" name="rcType">
        <Select
          options={RC_TYPE_OPTS.map((v) => ({ value: v, label: v }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
      <Form.Item label="Procurement Category" name="procurementCategory">
        <Select
          options={PROCUREMENT_CATEGORY_OPTS.map((v) => ({
            value: v,
            label: v,
          }))}
          disabled={formValues?.isVerified}
        />
      </Form.Item>
    </div>
  );

  const renderPricingSection = () => (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Settlement preview
          </p>
          <div className="mt-4 space-y-3">
            <ReviewRow
              label="Vehicle price"
              value={fmtMoney(formValues?.vehiclePrice)}
            />
            <ReviewRow
              label="Less fees / deduction"
              value={fmtMoney(formValues?.feesByUser)}
            />
            <ReviewRow
              label="Less holdback"
              value={fmtMoney(formValues?.holdbackAmount)}
            />
            <ReviewRow
              label="Token received"
              value={fmtMoney(formValues?.tokenAmount)}
            />
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-black text-slate-600">
                Balance transfer
              </p>
              <p className="text-xl font-black tracking-[-0.04em] text-emerald-700">
                {fmtMoney(deliveryBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:col-span-2">
          <MetricCard
            icon={DollarSign}
            title="Offer price"
            value={fmtCompactMoney(formValues?.vehiclePrice)}
            subtitle="gross"
            color="#0ea5e9"
            active
          />
          <MetricCard
            icon={Clock3}
            title="Holdback"
            value={fmtCompactMoney(formValues?.holdbackAmount)}
            subtitle={`${formValues?.holdbackDays || 0} days`}
            color="#f59e0b"
            active={Number(formValues?.holdbackAmount || 0) > 0}
          />
          <MetricCard
            icon={CheckCircle}
            title="Net payable"
            value={fmtCompactMoney(netPayable)}
            subtitle="after deductions"
            color="#10b981"
            active
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Form.Item label="Vehicle Price (INR)" name="vehiclePrice">
          <InputNumber
            className="!w-full"
            disabled={formValues?.isVerified}
            formatter={formatCurrencyInput}
            parser={parseCurrencyInput}
          />
        </Form.Item>
        <Form.Item label="Deduction / Fees (INR)" name="feesByUser">
          <InputNumber
            className="!w-full"
            disabled={formValues?.isVerified}
            formatter={formatCurrencyInput}
            parser={parseCurrencyInput}
          />
        </Form.Item>
        <Form.Item label="Holdback Amount (INR)" name="holdbackAmount">
          <InputNumber
            className="!w-full"
            disabled={formValues?.isVerified}
            formatter={formatCurrencyInput}
            parser={parseCurrencyInput}
          />
        </Form.Item>
        <Form.Item
          label="Holdback Condition"
          name="holdbackCondition"
          className="md:col-span-2"
        >
          <Select
            mode="multiple"
            options={HOLDBACK_CONDITION_OPTS.map((v) => ({
              value: v,
              label: v,
            }))}
            disabled={formValues?.isVerified}
          />
        </Form.Item>
        <Form.Item label="Permitted Holdback Days" name="holdbackDays">
          <InputNumber className="!w-full" disabled={formValues?.isVerified} />
        </Form.Item>
        <Form.Item
          label="Additional Services"
          name="additionalServices"
          className="md:col-span-3"
        >
          <Checkbox.Group
            options={ADDITIONAL_SERVICE_OPTS}
            disabled={formValues?.isVerified}
          />
        </Form.Item>
        <Form.Item label="Token Amount (INR)" name="tokenAmount">
          <InputNumber
            className="!w-full"
            disabled={formValues?.isVerified}
            formatter={formatCurrencyInput}
            parser={parseCurrencyInput}
          />
        </Form.Item>
        <Form.Item label="Balance Status" name="balanceStatus">
          <Select
            options={balanceStatusOptions}
            disabled={formValues?.isVerified}
          />
        </Form.Item>
      </div>
    </div>
  );

  const renderBankingSection = () => (
    <div className="space-y-5">
      <MiniPanel
        eyebrow="Banking"
        title="Receiver bank account"
        icon={Landmark}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item label="Account Holder Name" name="accHolderName">
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
          <Form.Item label="Account No." name="accountNo">
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
          <Form.Item label="Bank Name" name="bankName">
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
          <Form.Item label="IFSC Code" name="ifsc">
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
        </div>
      </MiniPanel>

      <MiniPanel
        eyebrow="Hypothecation"
        title="Loan closure and lien details"
        icon={LockKeyhole}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item
            label="Hypothecation / Loan Closure"
            name="hypothecation"
            className="md:col-span-2"
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              disabled={formValues?.isVerified}
            >
              <Radio.Button value="No">No</Radio.Button>
              <Radio.Button value="Yes">Yes</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <AnimatePresence initial={false}>
            {formValues?.hypothecation === "Yes" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:col-span-2"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Financer / Bank Name" name="financerName">
                    <Input disabled={formValues?.isVerified} />
                  </Form.Item>
                  <Form.Item label="Loan Status" name="loanStatus">
                    <Select
                      options={loanStatusOptions}
                      disabled={formValues?.isVerified}
                    />
                  </Form.Item>
                  <Form.Item label="Linked Loan?" name="linkedLoan">
                    <Radio.Group disabled={formValues?.isVerified}>
                      <Radio value="Yes">Yes</Radio>
                      <Radio value="No">No</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {formValues?.linkedLoan === "Yes" && (
                    <Form.Item
                      label="Linked Loan Status"
                      name="linkedLoanStatus"
                    >
                      <Select
                        options={loanStatusOptions}
                        disabled={formValues?.isVerified}
                      />
                    </Form.Item>
                  )}
                  <Form.Item label="Loan Account No" name="loanAccountNo">
                    <Input disabled={formValues?.isVerified} />
                  </Form.Item>
                  <Form.Item
                    label="Foreclosure Amount (INR)"
                    name="foreclosureAmount"
                  >
                    <InputNumber
                      className="!w-full"
                      disabled={formValues?.isVerified}
                      formatter={formatCurrencyInput}
                      parser={parseCurrencyInput}
                    />
                  </Form.Item>
                  <div className="md:col-span-2">
                    <UploadTile
                      label="Foreclosure Statement"
                      icon={FileText}
                      uploaded={!!formValues?.foreclosureStatement}
                      disabled={formValues?.isVerified}
                      onUpload={() => {
                        docForm.setFieldValue("foreclosureStatement", true);
                        persistCurrent();
                      }}
                      note="Optional proof document"
                      required={formValues?.hypothecation === "Yes"}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MiniPanel>

      <MiniPanel
        eyebrow="Compliance"
        title="BGC and challan summary"
        icon={Shield}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            icon={Shield}
            title="BGC status"
            value={bgcSummary.hasPending ? "Risk" : "Clear"}
            subtitle="indicator"
            color={bgcSummary.hasPending ? "#ef4444" : "#10b981"}
            active
          />
          <MetricCard
            icon={AlertCircle}
            title="E-challan"
            value={fmtCompactMoney(bgcSummary.echallanAmount)}
            subtitle="traffic"
            color="#ef4444"
            active={bgcSummary.echallanAmount > 0}
          />
          <MetricCard
            icon={DollarSign}
            title="Total dues"
            value={fmtCompactMoney(bgcSummary.totalAmount)}
            subtitle="BGC"
            color={bgcSummary.totalAmount > 0 ? "#ef4444" : "#10b981"}
            active
          />
        </div>

        <Divider />

        <div className="grid gap-4 md:grid-cols-4">
          <Form.Item label="Delhi Traffic Challan Count" name="challanCount">
            <InputNumber
              className="!w-full"
              disabled={formValues?.isVerified}
            />
          </Form.Item>
          <Form.Item label="Delhi Traffic Challan Amount" name="challanAmount">
            <InputNumber
              className="!w-full"
              disabled={formValues?.isVerified}
              formatter={formatCurrencyInput}
              parser={parseCurrencyInput}
            />
          </Form.Item>
          <Form.Item label="Vahan Challan Count" name="vahanChallanCount">
            <InputNumber
              className="!w-full"
              disabled={formValues?.isVerified}
            />
          </Form.Item>
          <Form.Item label="Vahan Challan Amount" name="vahanChallanAmount">
            <InputNumber
              className="!w-full"
              disabled={formValues?.isVerified}
              formatter={formatCurrencyInput}
              parser={parseCurrencyInput}
            />
          </Form.Item>
        </div>
      </MiniPanel>

      <MiniPanel eyebrow="KYC" title="KYC and proof uploads" icon={UploadCloud}>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item
            label="PAN Card No"
            name="panNo"
            rules={[{ required: true, message: "Please enter PAN number" }]}
          >
            <Input className="uppercase" disabled={formValues?.isVerified} />
          </Form.Item>
          <Form.Item
            label="Aadhaar Card No"
            name="aadhaarNo"
            rules={[{ required: true, message: "Please enter Aadhaar number" }]}
          >
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
          <Form.Item
            label="GST Number (Optional)"
            name="gstNumber"
            className="md:col-span-2"
          >
            <Input disabled={formValues?.isVerified} />
          </Form.Item>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <UploadTile
            label="Self Attested PAN Copy"
            icon={FileText}
            uploaded={!!formValues?.panAttested}
            disabled={formValues?.isVerified}
            required
            onUpload={() => {
              docForm.setFieldValue("panAttested", true);
              persistCurrent();
            }}
          />
          <UploadTile
            label="Self Attested Aadhaar Copy"
            icon={FileText}
            uploaded={!!formValues?.aadhaarAttested}
            disabled={formValues?.isVerified}
            required
            onUpload={() => {
              docForm.setFieldValue("aadhaarAttested", true);
              persistCurrent();
            }}
          />
          <UploadTile
            label="Customer Photo"
            icon={UserRound}
            uploaded={!!formValues?.photoUploaded}
            disabled={formValues?.isVerified}
            onUpload={() => {
              docForm.setFieldValue("photoUploaded", true);
              persistCurrent();
            }}
          />
          <UploadTile
            label="GST Certificate"
            icon={FileCheck2}
            uploaded={!!formValues?.gstUploaded}
            disabled={formValues?.isVerified}
            onUpload={() => {
              docForm.setFieldValue("gstUploaded", true);
              persistCurrent();
            }}
          />
        </div>
      </MiniPanel>
    </div>
  );

  const renderReviewSection = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Form.Item
          label="Agreement Execution Date"
          name="agreementDate"
          rules={[{ required: true, message: "Please select agreement date" }]}
        >
          <DatePicker className="!w-full" format="DD MMM YYYY" />
        </Form.Item>
        <Form.Item
          label="Handoff / Delivery Time"
          name="deliveryTime"
          rules={[{ required: true, message: "Please select delivery time" }]}
        >
          <TimePicker className="!w-full" format="HH:mm" />
        </Form.Item>
        <Form.Item
          label="Handoff Checklist"
          name="handoffChecklist"
          className="md:col-span-2"
        >
          <Checkbox.Group
            options={HANDOFF_OPTIONS}
            disabled={formValues?.isVerified}
          />
        </Form.Item>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MiniPanel eyebrow="Snapshot" title="Deal review" icon={Eye}>
          <ReviewRow label="Seller" value={formValues?.customerName} />
          <ReviewRow
            label="Vehicle"
            value={`${formValues?.make || ""} ${formValues?.model || ""}`}
          />
          <ReviewRow label="Registration" value={formValues?.regNo} />
          <ReviewRow
            label="Offer price"
            value={fmtMoney(formValues?.vehiclePrice)}
          />
          <ReviewRow label="Fees" value={fmtMoney(formValues?.feesByUser)} />
          <ReviewRow
            label="Holdback"
            value={fmtMoney(formValues?.holdbackAmount)}
          />
          <ReviewRow
            label="Token amount"
            value={fmtMoney(formValues?.tokenAmount)}
          />
          <ReviewRow label="Balance status" value={formValues?.balanceStatus} />
        </MiniPanel>

        <MiniPanel
          eyebrow="Compliance"
          title="Readiness review"
          icon={CheckCircle}
        >
          <ReviewRow
            label="PAN / Aadhaar"
            value={`${formValues?.panNo || "—"} / ${formValues?.aadhaarNo || "—"}`}
          />
          <ReviewRow label="Bank account" value={formValues?.accountNo} />
          <ReviewRow label="IFSC" value={formValues?.ifsc} />
          <ReviewRow label="Uploads completed" value={`${totalUploads}/5`} />
          <ReviewRow
            label="Manual challan total"
            value={fmtMoney(
              Number(formValues?.challanAmount || 0) +
                Number(formValues?.vahanChallanAmount || 0),
            )}
          />
          <ReviewRow
            label="BGC dues indicator"
            value={bgcSummary.hasPending ? "Liability detected" : "Clear"}
          />
          <ReviewRow
            label="Handoff checklist"
            value={`${(formValues?.handoffChecklist || []).length} items`}
          />
        </MiniPanel>
      </div>

      <MiniPanel
        eyebrow="Agreement builder"
        title="Generate legal contract"
        icon={Printer}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            icon={Activity}
            title="Progress"
            value={`${completionPercent}%`}
            subtitle="ready"
            color="#0ea5e9"
            active
          />
          <MetricCard
            icon={AlertCircle}
            title="Missing"
            value={`${missingCount}`}
            subtitle="items"
            color={missingCount ? "#f59e0b" : "#10b981"}
            active
          />
          <MetricCard
            icon={GalleryVertical}
            title="Uploads"
            value={`${totalUploads}/5`}
            subtitle="docs"
            color="#8b5cf6"
            active={totalUploads >= 3}
          />
          <MetricCard
            icon={DollarSign}
            title="Net payable"
            value={fmtCompactMoney(netPayable)}
            subtitle="seller"
            color="#10b981"
            active
          />
        </div>

        <Divider />

        <div className="flex flex-wrap gap-3">
          {!formValues?.isVerified ? (
            <Button
              type="primary"
              icon={<FileCheck2 size={16} />}
              onClick={handleFinalize}
              className="!h-11 !rounded-2xl !border-sky-600 !bg-sky-600 px-5 !font-bold shadow-sm"
            >
              Finalize Documentation & Unlock Agreement
            </Button>
          ) : (
            <>
              <Button
                icon={<PencilLine size={16} />}
                className="!h-11 !rounded-2xl !border-slate-200 !bg-white px-5 !font-bold !text-slate-700"
                onClick={handleUnlock}
              >
                Modify Records
              </Button>

              <Button
                type="primary"
                icon={<Printer size={16} />}
                className="!h-11 !rounded-2xl !border-emerald-600 !bg-emerald-600 px-5 !font-bold shadow-sm"
                onClick={openPreview}
              >
                Generate Print Agreement
              </Button>
            </>
          )}
        </div>
      </MiniPanel>
    </div>
  );

  return (
    <div
      className="doc-shell min-h-screen rounded-3xl bg-[#f6f8fb] p-4 md:p-5"
      style={FONT_VARS}
    >
      <style>{`
        .doc-shell {
          font-family: var(--default-font-family);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: "tnum" 1, "cv05" 1, "cv08" 1;
        }
        .doc-shell .ant-form-item { margin-bottom: 0 !important; }
        .doc-shell .ant-form-item-label > label {
          font-size: 10px !important;
          font-weight: 900 !important;
          letter-spacing: 0.09em !important;
          text-transform: uppercase !important;
          color: #64748b !important;
        }
        .doc-shell .ant-input,
        .doc-shell .ant-input-number,
        .doc-shell .ant-picker,
        .doc-shell .ant-select-selector,
        .doc-shell textarea.ant-input {
          min-height: 44px !important;
          border-color: #e2e8f0 !important;
          border-radius: 14px !important;
          background: #fbfdff !important;
          box-shadow: none !important;
          font-weight: 700 !important;
        }
        .doc-shell .ant-input-number-input {
          min-height: 42px !important;
          font-weight: 800 !important;
        }
        .doc-shell .ant-input:hover,
        .doc-shell .ant-input-number:hover,
        .doc-shell .ant-picker:hover,
        .doc-shell .ant-select-selector:hover,
        .doc-shell textarea.ant-input:hover {
          border-color: #cbd5e1 !important;
          background: #ffffff !important;
        }
        .doc-shell .ant-input:focus,
        .doc-shell .ant-input-focused,
        .doc-shell .ant-input-number-focused,
        .doc-shell .ant-picker-focused,
        .doc-shell .ant-select-focused .ant-select-selector,
        .doc-shell textarea.ant-input:focus {
          border-color: #0ea5e9 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.09) !important;
        }
        .doc-shell .ant-select-selector {
          display: flex !important;
          align-items: center !important;
        }
        .doc-shell .ant-radio-button-wrapper {
          border-color: #e2e8f0 !important;
          font-weight: 800 !important;
          box-shadow: none !important;
        }
        .doc-shell .ant-radio-button-wrapper-checked {
          color: #0369a1 !important;
          border-color: #7dd3fc !important;
          background: #e0f2fe !important;
        }
        .doc-shell .ant-checkbox-wrapper {
          font-weight: 700 !important;
          color: #334155 !important;
        }
        .doc-shell ::-webkit-scrollbar { width: 5px; height: 5px; }
        .doc-shell ::-webkit-scrollbar-track { background: transparent; }
        .doc-shell ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .doc-shell ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Queue
                </p>
                <h2 className="mt-1 text-base font-black text-slate-950">
                  Documentation
                </h2>
              </div>
              <Tooltip title="Refresh queue from local BGC storage">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
                >
                  <RefreshCw size={15} />
                </button>
              </Tooltip>
            </div>

            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                type="text"
                placeholder="Search lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <FilterChip
                label="All"
                count={leadFilterCounts.all}
                active={leadFilter === "all"}
                onClick={() => setLeadFilter("all")}
                color="#6366f1"
                icon={FileText}
              />
              <FilterChip
                label="Ready"
                count={leadFilterCounts.ready}
                active={leadFilter === "ready"}
                onClick={() => setLeadFilter("ready")}
                color="#10b981"
                icon={CheckCircle}
              />
              <FilterChip
                label="Pending"
                count={leadFilterCounts.pending}
                active={leadFilter === "pending"}
                onClick={() => setLeadFilter("pending")}
                color="#f59e0b"
                icon={Clock3}
              />
              <FilterChip
                label="Risk"
                count={leadFilterCounts.risk}
                active={leadFilter === "risk"}
                onClick={() => setLeadFilter("risk")}
                color="#ef4444"
                icon={AlertCircle}
              />
            </div>
          </div>

          <div className="mt-3 flex max-h-[calc(100vh-240px)] flex-col gap-2.5 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  active={selectedId === lead.id}
                  verified={leadStatuses[lead.id]}
                  onClick={() => setSelectedId(lead.id)}
                  readiness={leadReadiness[lead.id]?.readiness || 0}
                  missing={leadReadiness[lead.id]?.missing || 0}
                />
              ))}
            </AnimatePresence>
          </div>
        </aside>

        <main className="min-w-0">
          <Form
            form={docForm}
            layout="vertical"
            requiredMark={false}
            onValuesChange={handleValuesChange}
          >
            <DealIntelligenceCard
              selectedLead={selectedLead}
              formValues={formValues}
              bgcSummary={bgcSummary}
              netPayable={netPayable}
              deliveryBalance={deliveryBalance}
              totalUploads={totalUploads}
              completionPercent={completionPercent}
              missingCount={missingCount}
            />

            <div className="mt-5">
              <MissingAssistant
                missingItems={missingItems}
                setOpenSection={setOpenSection}
              />
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-5">
              {DOC_SECTIONS.map((section) => (
                <FilterChip
                  key={section.key}
                  label={section.short}
                  count={missingItems[section.key]?.length || 0}
                  active={openSection === section.key}
                  onClick={() => setOpenSection(section.key)}
                  color={sectionReady[section.key] ? "#10b981" : section.color}
                  icon={section.icon}
                />
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <SectionCard
                section={DOC_SECTIONS[0]}
                openSection={openSection}
                setOpenSection={setOpenSection}
                missing={missingItems.identity}
                ready={completion.identityReady}
              >
                {renderIdentitySection()}
              </SectionCard>

              <SectionCard
                section={DOC_SECTIONS[1]}
                openSection={openSection}
                setOpenSection={setOpenSection}
                missing={missingItems.vehicle}
                ready={completion.vehicleReady}
              >
                {renderVehicleSection()}
              </SectionCard>

              <SectionCard
                section={DOC_SECTIONS[2]}
                openSection={openSection}
                setOpenSection={setOpenSection}
                missing={missingItems.pricing}
                ready={completion.pricingReady}
              >
                {renderPricingSection()}
              </SectionCard>

              <SectionCard
                section={DOC_SECTIONS[3]}
                openSection={openSection}
                setOpenSection={setOpenSection}
                missing={missingItems.banking}
                ready={completion.bankReady}
              >
                {renderBankingSection()}
              </SectionCard>

              <SectionCard
                section={DOC_SECTIONS[4]}
                openSection={openSection}
                setOpenSection={setOpenSection}
                missing={missingItems.review}
                ready={completion.reviewReady}
              >
                {renderReviewSection()}
              </SectionCard>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-4 z-20 mt-5 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{
                      background: formValues?.isVerified
                        ? "#ecfdf5"
                        : missingCount
                          ? "#fffbeb"
                          : "#e0f2fe",
                      color: formValues?.isVerified
                        ? "#10b981"
                        : missingCount
                          ? "#f59e0b"
                          : "#0ea5e9",
                    }}
                  >
                    {formValues?.isVerified ? (
                      <CheckCircle size={19} />
                    ) : missingCount ? (
                      <AlertCircle size={19} />
                    ) : (
                      <Sparkles size={19} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {formValues?.isVerified
                        ? "Agreement builder is unlocked."
                        : missingCount
                          ? `${missingCount} items still need attention.`
                          : "Everything looks ready for verification."}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Auto-saved · {completionPercent}% complete · uploads{" "}
                      {totalUploads}/5
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    onClick={saveDraft}
                    className="!h-11 !rounded-2xl !border-slate-200 !bg-white px-5 !font-bold !text-slate-700"
                  >
                    Save Draft
                  </Button>

                  {formValues?.isVerified ? (
                    <>
                      <Button
                        icon={<PencilLine size={16} />}
                        onClick={handleUnlock}
                        className="!h-11 !rounded-2xl !border-slate-200 !bg-white px-5 !font-bold !text-slate-700"
                      >
                        Modify
                      </Button>
                      <Button
                        type="primary"
                        icon={<Printer size={16} />}
                        onClick={openPreview}
                        className="!h-11 !rounded-2xl !border-emerald-600 !bg-emerald-600 px-5 !font-bold shadow-sm"
                      >
                        Open Agreement
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={<FileCheck2 size={16} />}
                      onClick={handleFinalize}
                      className="!h-11 !rounded-2xl !border-sky-600 !bg-sky-600 px-5 !font-bold shadow-sm"
                    >
                      Verify & Unlock
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </Form>
        </main>
      </div>

      <AgreementPreview
        visible={showPreview}
        onCancel={() => setShowPreview(false)}
        data={{
          ...formValues,
          agreementDate:
            formValues?.agreementDate?.toISOString?.() ||
            formValues?.agreementDate,
          deliveryTime:
            formValues?.deliveryTime?.toISOString?.() ||
            formValues?.deliveryTime,
        }}
      />
    </div>
  );
}
