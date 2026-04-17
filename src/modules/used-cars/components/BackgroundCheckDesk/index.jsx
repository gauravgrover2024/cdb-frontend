import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Tag,
  Tabs,
  Tooltip,
  Upload,
  message,
} from "antd";
import {
  SaveOutlined,
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
  CheckCircleFilled,
  FileSearchOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowUpOutlined,
  CarOutlined,
  DownOutlined,
  CalendarOutlined,
  BankOutlined,
  WarningFilled,
  StopFilled,
  InfoCircleOutlined,
  SyncOutlined,
  FilterOutlined,
  FileTextOutlined,
  EditOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
  LeftOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  BGC_STATUS,
  OWNERSHIP_SERIAL_OPTS,
  FUEL_TYPE_OPTS,
  ROAD_TAX_STATUS_OPTS,
  NOC_STATUS_OPTS,
  PARTY_PESHI_OPTS,
  SERVICE_HISTORY_OPTS,
  ACCIDENT_HISTORY_OPTS,
  ODOMETER_STATUS_OPTS,
  getDefaultBgcValues,
} from "./constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";
import { usedCarsApi } from "../../../../api/usedCars";
import { uploadMultipleFiles } from "../../../../api/uploads";

const { TextArea } = Input;

const DATE_FIELDS = ["regdDate", "rcExpiry", "roadTaxExpiry", "lastServiceDate"];
const FILE_FIELDS = [
  "blacklistedFiles",
  "theftFiles",
  "echallanFiles",
  "dtpFiles",
  "serviceFiles",
];

const LOCAL_TO_BACKEND_STATUS = {
  [BGC_STATUS.PENDING]: "Pending",
  [BGC_STATUS.VAHAN_DONE]: "Vahan Done",
  [BGC_STATUS.COMPLETE]: "BGC Complete",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ESCALATED: "Escalated",
};

const BACKEND_TO_LOCAL_STATUS = {
  Pending: BGC_STATUS.PENDING,
  "Vahan Done": BGC_STATUS.VAHAN_DONE,
  "BGC Complete": BGC_STATUS.COMPLETE,
  Approved: "APPROVED",
  Rejected: "REJECTED",
  Escalated: "ESCALATED",
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const toUploadFile = (file = {}) => {
  const url = file.url || file.thumbUrl || file.preview || "";
  return {
    uid: file.uid || file.publicId || file._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name || file.fileName || file.originalName || "Document",
    status: "done",
    url,
    thumbUrl: file.thumbUrl || url,
    preview: file.preview || url,
    type: file.type || file.mimeType || "",
    size: file.size || 0,
    response: file,
    evidenceTag: file.evidenceTag || "",
    customTagName: file.customTagName || "",
    publicId: file.publicId || "",
  };
};

const toUploadFileList = (files = []) => safeArray(files).filter(Boolean).map(toUploadFile);

const serializeUploadFile = (file = {}) => {
  const response = file.response && typeof file.response === "object" ? file.response : {};
  const url = file.url || response.url || file.thumbUrl || file.preview || "";
  return {
    uid: String(file.uid || response.uid || response.publicId || ""),
    name: file.name || response.name || "Document",
    url,
    thumbUrl: file.thumbUrl || response.thumbUrl || url,
    preview: file.preview || response.preview || url,
    evidenceTag: file.evidenceTag || response.evidenceTag || "",
    customTagName: file.customTagName || response.customTagName || "",
    publicId: file.publicId || response.publicId || "",
    format: response.format || "",
    size: Number(file.size || response.size || 0) || 0,
    source: response.source || "r2",
    uploadedAt: response.uploadedAt || new Date().toISOString(),
  };
};

const normalizeDateField = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs?.(value)) return value;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const normalizeBgcFormValuesFromBackend = (lead = {}) => {
  const defaults = getDefaultBgcValues(lead);
  const formValues = lead?.backgroundCheck?.formValues || {};
  const merged = { ...defaults, ...formValues };
  DATE_FIELDS.forEach((key) => {
    merged[key] = normalizeDateField(merged[key]);
  });
  FILE_FIELDS.forEach((key) => {
    merged[key] = toUploadFileList(merged[key]);
  });
  return merged;
};

const serializeBgcFormValuesForBackend = (values = {}) => {
  const payload = { ...(values || {}) };
  DATE_FIELDS.forEach((key) => {
    const value = payload[key];
    if (!value) {
      payload[key] = null;
      return;
    }
    payload[key] = dayjs.isDayjs?.(value) ? value.toISOString() : String(value);
  });
  FILE_FIELDS.forEach((key) => {
    payload[key] = safeArray(payload[key]).map(serializeUploadFile);
  });
  return payload;
};

const buildBgcEvidenceVault = (values = {}) => {
  const sourceMap = {
    blacklistedFiles: "Blacklist Proof",
    theftFiles: "Theft Proof",
    echallanFiles: "eChallan Proof",
    dtpFiles: "DTP Proof",
    serviceFiles: "Service Record",
  };
  return Object.entries(sourceMap).flatMap(([field, tag]) =>
    safeArray(values[field]).map((file) => ({
      ...serializeUploadFile(file),
      evidenceTag: serializeUploadFile(file).evidenceTag || tag,
    })),
  );
};

const buildBgcSummary = (values = {}) => {
  const riskFlags = [];
  if (values.blacklisted === "Yes") riskFlags.push("Blacklisted");
  if (values.theft === "Yes") riskFlags.push("Theft record");
  if (values.challanPending === "Yes") riskFlags.push("Challan pending");
  if (values.odometerStatus && values.odometerStatus !== "Not Tampered") {
    riskFlags.push("Odometer concern");
  }
  if (values.floodedCar === "Yes") riskFlags.push("Flooded history");
  if (values.totalLossVehicle === "Yes") riskFlags.push("Total loss history");

  return {
    vahanVerified: Boolean(values.ownerName && values.ownershipSerialNo),
    serviceVerified: values.serviceHistoryAvailable === "Yes",
    legalClear: values.blacklisted !== "Yes" && values.theft !== "Yes",
    riskFlags,
  };
};

const toBackendStatus = (status) =>
  LOCAL_TO_BACKEND_STATUS[status] || "Pending";

const toLocalStatus = (status) =>
  BACKEND_TO_LOCAL_STATUS[status] || BGC_STATUS.PENDING;

const mapApiLeadToDeskLead = (lead = {}) => {
  const localStatus = toLocalStatus(lead?.backgroundCheck?.status);
  const formValues = normalizeBgcFormValuesFromBackend(lead);
  return {
    ...lead,
    id: lead.id || lead.backendId,
    bgcStatus: localStatus,
    bgcData: formValues,
    auditTrail: safeArray(lead?.backgroundCheck?.auditTrail).map((event) => ({
      type: event.type || "saved",
      action: event.action || "Draft Saved",
      note: event.note || "",
      actor: event.actor || "",
      timestamp: event.at
        ? dayjs(event.at).format("DD/MM/YYYY, hh:mm A")
        : dayjs().format("DD/MM/YYYY, hh:mm A"),
    })),
    inspectionScore:
      Number(
        lead?.inspection?.report?.overallScore ||
          lead?.inspection?.report?.score ||
          lead?.procurementScore ||
          0,
      ) || 0,
  };
};

const ACTION_CONFIGS = {
  approve: {
    type: "approve",
    title: "Approve Vehicle",
    description:
      "This vehicle will be approved and moved to the next pipeline stage. This action is logged.",
    icon: <CheckOutlined />,
    newStatus: "APPROVED",
    auditType: "approved",
    auditAction: "Vehicle Approved",
  },
  reject: {
    type: "reject",
    title: "Reject Vehicle",
    description:
      "This vehicle will be rejected and removed from the active pipeline. The sourcing team will be notified.",
    icon: <CloseOutlined />,
    newStatus: "REJECTED",
    auditType: "rejected",
    auditAction: "Vehicle Rejected",
  },
  escalate: {
    type: "escalate",
    title: "Escalate for Review",
    description:
      "This vehicle will be flagged for senior officer review. Please include a reason.",
    icon: <ArrowUpOutlined />,
    newStatus: "ESCALATED",
    auditType: "escalated",
    auditAction: "Escalated for Senior Review",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HARD BUSINESS RULES ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
function getHardRule(values) {
  if (values.blacklisted === "Yes") {
    return {
      type: "auto-reject",
      reason: "Vehicle is blacklisted — automatic rejection required.",
      icon: <StopFilled />,
      color: "danger",
      severity: "critical",
    };
  }
  if (values.theft === "Yes") {
    return {
      type: "auto-reject",
      reason: "Theft record found — automatic rejection required.",
      icon: <StopFilled />,
      color: "danger",
      severity: "critical",
    };
  }
  if (values.floodedCar === "Yes") {
    return {
      type: "manual",
      reason:
        "Flood-damaged vehicle — manual senior approval required before proceeding.",
      icon: <WarningFilled />,
      color: "warning",
      severity: "high",
    };
  }
  return null;
}

function isAutoRejectedLead(lead = {}) {
  const closure = String(lead?.closureReason || "").toLowerCase();
  const auditTrail = Array.isArray(lead?.auditTrail) ? lead.auditTrail : [];
  if (auditTrail.some((event) => event?.type === "auto_reject")) return true;
  return (
    closure.includes("automatic rejection required") ||
    closure.includes("blacklisted") ||
    closure.includes("theft record")
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLISHED BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function StatusBadge({ status, size = "default" }) {
  const configs = {
    [BGC_STATUS.PENDING]: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-400",
      pulse: true,
    },
    [BGC_STATUS.VAHAN_DONE]: {
      bg: "bg-sky-50 dark:bg-sky-500/10",
      border: "border-sky-200 dark:border-sky-500/30",
      text: "text-sky-700 dark:text-sky-400",
      dot: "bg-sky-400",
      pulse: false,
    },
    [BGC_STATUS.COMPLETE]: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-400",
      pulse: false,
    },
    APPROVED: {
      bg: "bg-green-50 dark:bg-green-500/10",
      border: "border-green-200 dark:border-green-500/30",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
      pulse: false,
    },
    REJECTED: {
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/30",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
      pulse: false,
    },
    ESCALATED: {
      bg: "bg-violet-50 dark:bg-violet-500/10",
      border: "border-violet-200 dark:border-violet-500/30",
      text: "text-violet-700 dark:text-violet-400",
      dot: "bg-violet-500",
      pulse: true,
    },
  };

  const config = configs[status] || configs[BGC_STATUS.PENDING];
  const sizeClasses =
    size === "small"
      ? "px-2 py-0.5 text-[9px] gap-1"
      : "px-3 py-1 text-[10px] gap-1.5";

  return (
    <span
      className={`inline-flex items-center ${sizeClasses} rounded-full border font-bold uppercase tracking-wide ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`relative flex h-2 w-2`}>
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75 animate-ping`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}
        />
      </span>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSPECTION SCORE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function InspectionScore({ score }) {
  const getScoreConfig = (score) => {
    if (score >= 80)
      return { color: "#10b981", label: "Excellent", bg: "bg-emerald-50" };
    if (score >= 60)
      return { color: "#f59e0b", label: "Good", bg: "bg-amber-50" };
    return { color: "#ef4444", label: "Poor", bg: "bg-red-50" };
  };

  const config = getScoreConfig(score);

  return (
    <Tooltip title={`${config.label} Condition (${score}%)`}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${config.bg}`}
        style={{ borderColor: `${config.color}30` }}
      >
        <TrophyOutlined style={{ color: config.color, fontSize: 12 }} />
        <span
          className="text-[11px] font-black"
          style={{ color: config.color }}
        >
          {score}%
        </span>
      </div>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARD RULE ALERT
// ═══════════════════════════════════════════════════════════════════════════════
function HardRuleAlert({ rule }) {
  if (!rule) return null;

  const configs = {
    danger: {
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/30",
      icon: "text-red-500",
      title: "text-red-800 dark:text-red-300",
      desc: "text-red-600 dark:text-red-400",
      badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/30",
      icon: "text-amber-500",
      title: "text-amber-800 dark:text-amber-300",
      desc: "text-amber-600 dark:text-amber-400",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    },
  };

  const config = configs[rule.color] || configs.warning;
  const isAutoReject = rule.type === "auto-reject";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${config.bg} ${config.border} p-4`}
    >
      {/* Decorative gradient */}
      <div
        className={`absolute inset-0 opacity-10 ${
          isAutoReject
            ? "bg-gradient-to-r from-red-500 to-rose-500"
            : "bg-gradient-to-r from-amber-500 to-orange-500"
        }`}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-white/10 shadow-sm ${config.icon}`}
        >
          {rule.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Tag
              className={`!m-0 text-[10px] font-black uppercase tracking-wider ${config.badge}`}
            >
              {isAutoReject ? "Auto-Reject" : "Manual Review Required"}
            </Tag>
            <span className="text-[10px] text-slate-400">
              {isAutoReject
                ? "Immediate action taken"
                : "Senior approval needed"}
            </span>
          </div>
          <p className={`text-sm font-bold ${config.desc}`}>{rule.reason}</p>
        </div>

        <Button
          size="small"
          icon={<InfoCircleOutlined />}
          className="!flex-shrink-0"
        >
          Details
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function SectionCard({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
  badgeColor = "blue",
}) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeColors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_35px_-28px_rgba(15,23,42,0.5)] transition-all hover:shadow-[0_20px_42px_-30px_rgba(15,23,42,0.55)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-slate-50 to-white px-5 py-4 text-left transition-colors hover:from-sky-50 hover:to-white"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <span className="text-slate-500">{icon}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
              {title}
            </h3>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColors[badgeColor]}`}
              >
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {open ? "Hide" : "Show"}
          </span>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <DownOutlined className="text-[10px] text-slate-500" />
          </div>
        </div>
      </button>

      <div
        className={`transition-all duration-300 ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="border-t border-slate-100 px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAHAN SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function VahanSnapshot({ values, lead }) {
  const totalChallan = Number(values.echallanAmount || 0) + Number(values.dtpAmount || 0);
  const riskFlags = [
    values.blacklisted === "Yes",
    values.theft === "Yes",
    values.hypothecation === "Yes",
    values.partyPeshi?.includes("Applicable"),
    values.challanPending === "Yes",
  ].filter(Boolean).length;

  const checks = [
    {
      label: "Blacklisted",
      value: values.blacklisted || "No",
      tone: values.blacklisted === "Yes" ? "danger" : "safe",
    },
    {
      label: "Theft Record",
      value: values.theft || "No",
      tone: values.theft === "Yes" ? "danger" : "safe",
    },
    {
      label: "Road Tax",
      value: values.roadTaxStatus || "Pending",
      tone: values.roadTaxStatus === "Paid" ? "safe" : "warn",
    },
    {
      label: "RTO NOC",
      value: values.rtoNocIssued || "Pending",
      tone: values.rtoNocIssued === "Issued" ? "safe" : "warn",
    },
    {
      label: "Hypothecation",
      value: values.hypothecation || "No",
      tone: values.hypothecation === "Yes" ? "warn" : "safe",
    },
    {
      label: "Party Peshi",
      value: values.partyPeshi || "Not Applicable",
      tone: values.partyPeshi?.includes("Applicable") ? "warn" : "safe",
    },
  ];

  const proofRows = [
    { key: "blacklistedFiles", label: "Blacklist Proof" },
    { key: "theftFiles", label: "Theft Proof" },
    { key: "echallanFiles", label: "eChallan Proof" },
    { key: "dtpFiles", label: "DTP Proof" },
  ];

  const getToneClass = (tone) => {
    if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
    if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Owner</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {values.ownerName || lead?.name || "Pending"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{lead?.mobile || "Mobile pending"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vehicle</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {[values.make, values.model].filter(Boolean).join(" ") || "Pending"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{values.variant || "Variant pending"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Registration</p>
          <p className="mt-1 text-sm font-black text-slate-900">{lead?.regNo || "Pending"}</p>
          <p className="mt-1 text-xs text-slate-500">
            RC: {values.rcExpiry ? dayjs(values.rcExpiry).format("DD MMM YYYY") : "Pending"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Risk Snapshot</p>
          <p className="mt-1 text-sm font-black text-slate-900">{riskFlags} active flags</p>
          <p className="mt-1 text-xs text-slate-500">
            Challan: {totalChallan ? `₹${totalChallan.toLocaleString("en-IN")}` : "Clear"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Vahan Check Snapshot
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              Live from form
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {checks.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${getToneClass(item.tone)}`}
              >
                <span className="text-xs font-semibold">{item.label}</span>
                <span className="text-xs font-black">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Linked Proofs
          </p>
          <div className="space-y-2">
            {proofRows.map((row) => {
              const files = values[row.key] || [];
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => {
                    const url = files?.[0]?.url || files?.[0]?.preview;
                    if (url) window.open(url, "_blank");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-all hover:border-sky-300 hover:bg-sky-50"
                >
                  <span className="text-xs font-semibold text-slate-700">{row.label}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {files.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {values.vahanComments && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Analyst Note</p>
          <p className="mt-2 text-sm text-slate-700">{values.vahanComments}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function ServiceSnapshot({ values }) {
  const signalRows = [
    {
      label: "Service History",
      value: values.serviceHistoryAvailable || "Pending",
      tone: values.serviceHistoryAvailable === "Yes" ? "safe" : "warn",
    },
    {
      label: "Accident History",
      value: values.accidentHistory || "Pending",
      tone: values.accidentHistory && values.accidentHistory !== "None" ? "warn" : "safe",
    },
    {
      label: "Odometer Integrity",
      value: values.odometerStatus || "Pending",
      tone: values.odometerStatus && values.odometerStatus !== "Not Tampered" ? "warn" : "safe",
    },
    {
      label: "Flood / Total Loss",
      value:
        values.floodedCar === "Yes" || values.totalLossVehicle === "Yes"
          ? "Flagged"
          : "Clear",
      tone:
        values.floodedCar === "Yes" || values.totalLossVehicle === "Yes"
          ? "danger"
          : "safe",
    },
  ];

  const toneClass = (tone) => {
    if (tone === "danger") return "border-red-200 bg-red-50 text-red-700";
    if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {signalRows.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${toneClass(item.tone)}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{item.label}</p>
            <p className="mt-1 text-sm font-black">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Service Fact Sheet
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              [
                "Last Service Date",
                values.lastServiceDate
                  ? dayjs(values.lastServiceDate).format("DD MMM YYYY")
                  : "Pending",
              ],
              [
                "Last Service Odometer",
                values.lastServiceOdometer
                  ? `${Number(values.lastServiceOdometer).toLocaleString("en-IN")} km`
                  : "Pending",
              ],
              [
                "Current Odometer",
                values.currentOdometer
                  ? `${Number(values.currentOdometer).toLocaleString("en-IN")} km`
                  : "Pending",
              ],
              ["Migrated Vehicle", values.migratedVehicle || "Pending"],
              ["Flooded Car", values.floodedCar || "Pending"],
              ["Total Loss", values.totalLossVehicle || "Pending"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-xs font-semibold text-slate-700">{label}</span>
                <span className="text-xs font-black text-slate-600">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Service Evidence
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold text-slate-700">Documents</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-600">
                {(values.serviceFiles || []).length}
              </span>
            </div>
            {(values.serviceFiles || []).length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const url = values.serviceFiles?.[0]?.url || values.serviceFiles?.[0]?.preview;
                  if (url) window.open(url, "_blank");
                }}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-xs font-bold text-sky-700 hover:border-sky-300"
              >
                Open service record
              </button>
            ) : (
              <p className="text-xs text-slate-500">No service document uploaded.</p>
            )}
          </div>
        </div>
      </div>

      {values.serviceComments && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Analyst Note</p>
          <p className="mt-2 text-sm text-slate-700">{values.serviceComments}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART EVIDENCE VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
function SmartEvidenceViewer({ values }) {
  const [preview, setPreview] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  const allFiles = [
    ...(values.blacklistedFiles || []).map((f) => ({
      ...f,
      tag: "Blacklist",
      color: "red",
    })),
    ...(values.theftFiles || []).map((f) => ({
      ...f,
      tag: "Theft",
      color: "red",
    })),
    ...(values.echallanFiles || []).map((f) => ({
      ...f,
      tag: "eChallan",
      color: "amber",
    })),
    ...(values.dtpFiles || []).map((f) => ({
      ...f,
      tag: "DTP",
      color: "amber",
    })),
    ...(values.serviceFiles || []).map((f) => ({
      ...f,
      tag: "Service",
      color: "blue",
    })),
  ];

  const tagColors = {
    red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200",
  };

  if (allFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
          <FileSearchOutlined className="text-2xl text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          No Evidence Files Attached
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Upload documents in the Vahan or Service tabs
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {allFiles.length} File{allFiles.length !== 1 ? "s" : ""} Attached
        </p>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              viewMode === "grid"
                ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              viewMode === "list"
                ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {allFiles.map((file, idx) => {
            const url = file.url || file.preview;
            const isPdf =
              file.name?.endsWith(".pdf") || file.type === "application/pdf";

            return (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  url &&
                  setPreview({
                    url,
                    name: file.name || file.tag,
                    tag: file.tag,
                    color: file.color,
                  })
                }
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 transition-all hover:border-sky-400 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                {url && !isPdf ? (
                  <img
                    src={url}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <FileTextOutlined className="text-3xl text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">
                      PDF
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex justify-end">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${tagColors[file.color]}`}
                    >
                      {file.tag}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
                      <EyeOutlined className="text-sky-600" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {allFiles.map((file, idx) => {
            const url = file.url || file.preview;
            return (
              <button
                key={idx}
                onClick={() =>
                  url &&
                  setPreview({
                    url,
                    name: file.name || file.tag,
                    tag: file.tag,
                    color: file.color,
                  })
                }
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-sky-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                  <FileTextOutlined className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {file.name || `Document ${idx + 1}`}
                  </p>
                  <p className="text-xs text-slate-400">{file.tag}</p>
                </div>
                <EyeOutlined className="text-sky-500" />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      <Modal
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        title={
          <div className="flex items-center gap-3">
            <span
              className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${tagColors[preview?.color]}`}
            >
              {preview?.tag}
            </span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {preview?.name}
            </span>
          </div>
        }
        width={800}
        centered
        className="evidence-modal"
        bodyStyle={{ padding: 0 }}
      >
        <div className="flex items-center justify-center bg-slate-100 dark:bg-black/50 p-4">
          {preview?.url && (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[70vh] rounded-xl object-contain shadow-lg"
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-white/10">
          <Button icon={<LeftOutlined />} onClick={() => setPreview(null)}>
            Close
          </Button>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => window.open(preview?.url, "_blank")}
          >
            Open in New Tab
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
function AuditTimeline({ events }) {
  const typeConfig = {
    approved: {
      icon: <CheckOutlined />,
      bg: "bg-emerald-500",
      label: "text-emerald-600",
    },
    rejected: {
      icon: <CloseOutlined />,
      bg: "bg-red-500",
      label: "text-red-600",
    },
    escalated: {
      icon: <ArrowUpOutlined />,
      bg: "bg-violet-500",
      label: "text-violet-600",
    },
    saved: {
      icon: <SaveOutlined />,
      bg: "bg-slate-400",
      label: "text-slate-500",
    },
    vahan_done: {
      icon: <CheckCircleFilled />,
      bg: "bg-sky-500",
      label: "text-sky-600",
    },
    complete: {
      icon: <CheckCircleFilled />,
      bg: "bg-emerald-500",
      label: "text-emerald-600",
    },
    auto_reject: {
      icon: <StopFilled />,
      bg: "bg-red-600",
      label: "text-red-600",
    },
    info: {
      icon: <InfoCircleOutlined />,
      bg: "bg-slate-300 dark:bg-slate-600",
      label: "text-slate-500",
    },
  };

  if (!events?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 dark:border-white/10">
        <HistoryOutlined className="mb-3 text-3xl text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold text-slate-500">
          No Audit Events Yet
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Actions will be logged here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...events].reverse().map((event, idx) => {
        const cfg = typeConfig[event.type] || typeConfig.info;
        return (
          <div
            key={`${event.timestamp || "event"}-${idx}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-white ${cfg.bg}`}>
                  {cfg.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{event.action}</p>
                  <p className="text-xs text-slate-500">
                    {event.actor ? `by ${event.actor}` : "System"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {event.timestamp}
              </span>
            </div>
            {event.note ? (
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {event.note}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════
function ActionButtons({ onApprove, onReject, onEscalate, saving, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip title={disabled ? "Cannot approve auto-rejected vehicles" : ""}>
        <span>
          <Button
            onClick={onApprove}
            loading={saving}
            disabled={disabled}
            className="!flex !items-center !gap-2 !rounded-xl !border-emerald-300 !bg-emerald-50 !px-4 !py-2 !text-sm !font-bold !text-emerald-700 transition-all hover:!border-emerald-400 hover:!bg-emerald-100 hover:shadow-sm disabled:!opacity-50"
            icon={<CheckOutlined />}
          >
            Approve
          </Button>
        </span>
      </Tooltip>

      <Button
        onClick={onReject}
        loading={saving}
        className="!flex !items-center !gap-2 !rounded-xl !border-red-200 !bg-red-50 !px-4 !py-2 !text-sm !font-bold !text-red-600 transition-all hover:!border-red-300 hover:!bg-red-100 hover:shadow-sm"
        icon={<CloseOutlined />}
      >
        Reject
      </Button>

      <Tooltip title={disabled ? "Cannot escalate auto-rejected vehicles" : ""}>
        <span>
          <Button
            onClick={onEscalate}
            loading={saving}
            disabled={disabled}
            className="!flex !items-center !gap-2 !rounded-xl !border-violet-200 !bg-violet-50 !px-4 !py-2 !text-sm !font-bold !text-violet-700 transition-all hover:!border-violet-300 hover:!bg-violet-100 hover:shadow-sm disabled:!opacity-50"
            icon={<ArrowUpOutlined />}
          >
            Escalate
          </Button>
        </span>
      </Tooltip>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE CARD (IMPROVED)
// ═══════════════════════════════════════════════════════════════════════════════
function QueueCard({ lead, active, onClick }) {
  const rule = getHardRule(lead.bgcData || {});
  const tone =
    lead.bgcStatus === BGC_STATUS.PENDING
      ? "amber"
      : lead.bgcStatus === BGC_STATUS.VAHAN_DONE
        ? "sky"
        : lead.bgcStatus === BGC_STATUS.COMPLETE || lead.bgcStatus === "APPROVED"
          ? "emerald"
          : lead.bgcStatus === "ESCALATED"
            ? "violet"
            : "rose";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? "border-blue-400 bg-gradient-to-br from-blue-50 to-white shadow-lg ring-2 ring-blue-100"
          : "border-slate-200 bg-white shadow-[0_8px_20px_-16px_rgba(15,23,42,0.4)] hover:border-slate-300 hover:shadow-[0_12px_26px_-16px_rgba(15,23,42,0.45)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
          tone === "amber"
            ? "bg-amber-400"
            : tone === "sky"
              ? "bg-sky-400"
              : tone === "emerald"
                ? "bg-emerald-400"
                : tone === "violet"
                  ? "bg-violet-400"
                  : "bg-rose-400"
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {lead.make} {lead.model}
            </h4>
            {rule?.type === "auto-reject" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <StopFilled className="text-[10px] text-red-500" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lead.variant} · {lead.mfgYear}
          </p>
          <p className="mt-1.5 text-xs font-bold tracking-wider text-slate-700">
            {lead.regNo}
          </p>
        </div>

        <InspectionScore score={lead.inspectionScore} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
          {lead.assignedTo}
        </p>
        <StatusBadge status={lead.bgcStatus} size="small" />
      </div>

      {rule && rule.type !== "auto-reject" && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
          <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-700">
            <WarningFilled />
            Manual Review Required
          </span>
        </div>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
function EvidenceUpload({ label, maxCount = 1, fileList = [], onChange }) {
  const handleUpload = useCallback(
    async ({ file, onSuccess, onError }) => {
      try {
        const uploaded = await uploadMultipleFiles([file]);
        const first = uploaded?.[0];
        if (!first?.url) {
          throw new Error("Upload succeeded but URL missing.");
        }
        onSuccess(first);
      } catch (error) {
        onError(error);
      }
    },
    [],
  );

  return (
    <Upload
      listType="picture-card"
      fileList={fileList}
      customRequest={handleUpload}
      onPreview={(file) => {
        if (file.url || file.preview)
          window.open(file.url || file.preview, "_blank");
      }}
      onChange={({ fileList: newFileList }) => {
        const normalized = newFileList.map((file) => {
          const response =
            file.response && typeof file.response === "object"
              ? file.response
              : {};
          const url = file.url || response.url || file.thumbUrl || file.preview;
          return {
            ...file,
            status: file.status || "done",
            url,
            thumbUrl: file.thumbUrl || response.thumbUrl || url,
            preview: file.preview || response.preview || url,
            publicId: file.publicId || response.publicId || "",
            response,
          };
        });
        onChange(normalized);
      }}
      accept="image/*,application/pdf"
      maxCount={maxCount}
    >
      {fileList.length < maxCount && (
        <div className="flex flex-col items-center justify-center">
          <PlusOutlined className="text-slate-400 text-lg" />
          <span className="mt-1 text-[10px] font-semibold text-slate-500">
            {label || "Upload"}
          </span>
        </div>
      )}
    </Upload>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHALLAN CARD
// ═══════════════════════════════════════════════════════════════════════════════
function ChallanCard({
  title,
  icon,
  countName,
  amountName,
  filesName,
  values,
  colorScheme,
}) {
  const count = values[countName] || 0;
  const amount = values[amountName] || 0;
  const colors = {
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-500",
      accent: "text-amber-600",
      hover: "hover:border-amber-300",
    },
    rose: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      icon: "text-rose-500",
      accent: "text-rose-600",
      hover: "hover:border-rose-300",
    },
  };
  const c = colors[colorScheme] || colors.amber;

  return (
    <div
      className={`rounded-2xl border ${c.border} ${c.bg} p-5 shadow-sm transition-all ${c.hover} hover:shadow-md dark:border-white/10 dark:${c.bg}/10`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-white/10 ${c.icon}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </p>
            <p className={`text-sm font-bold ${c.accent}`}>{count} Pending</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400">Total Liability</p>
          <p className={`text-lg font-black ${c.accent}`}>
            ₹{Number(amount).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500">
            Count
          </label>
          <Form.Item name={countName} noStyle>
            <InputNumber
              min={0}
              className="!w-full !rounded-xl"
              placeholder="Qty"
            />
          </Form.Item>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500">
            Amount (₹)
          </label>
          <Form.Item name={amountName} noStyle>
            <InputNumber
              min={0}
              className="!w-full !rounded-xl"
              placeholder="Amount"
              formatter={(v) =>
                v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
            />
          </Form.Item>
        </div>
      </div>

      <div className="border-t border-slate-200/50 pt-4 dark:border-white/10">
        <p className="mb-2 text-[10px] font-semibold text-slate-500">
          Evidence
        </p>
        <Form.Item
          name={filesName}
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          noStyle
        >
          <EvidenceUpload maxCount={3} />
        </Form.Item>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function ConfirmModal({ open, config, onConfirm, onCancel }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  if (!config) return null;

  const configs = {
    approve: {
      icon: <CheckOutlined />,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      buttonClass: "!bg-emerald-500 hover:!bg-emerald-600",
      title: "Approve Vehicle",
    },
    reject: {
      icon: <CloseOutlined />,
      bg: "bg-red-50",
      iconColor: "text-red-500",
      buttonClass: "!bg-red-500 hover:!bg-red-600",
      title: "Reject Vehicle",
    },
    escalate: {
      icon: <ArrowUpOutlined />,
      bg: "bg-violet-50",
      iconColor: "text-violet-500",
      buttonClass: "!bg-violet-500 hover:!bg-violet-600",
      title: "Escalate for Review",
    },
  };

  const style = configs[config.type] || configs.approve;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={440}
      className="confirm-modal"
    >
      <div className="py-4">
        <div
          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${style.bg}`}
        >
          <span className={`text-2xl ${style.iconColor}`}>{style.icon}</span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {style.title}
        </h3>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {config.description}
        </p>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Reason / Note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <TextArea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context or reason for this decision..."
            className="!rounded-xl"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button onClick={onCancel} className="!rounded-xl">
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={() => onConfirm(note)}
            className={`!rounded-xl !font-bold ${style.buttonClass}`}
          >
            {style.title}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function UsedCarBackgroundCheckDesk() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [bgcForm] = Form.useForm();
  const [formValues, setFormValues] = useState({});
  const [activeTab, setActiveTab] = useState("vahan");
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    config: null,
  });
  const autoSaveTimerRef = useRef(null);
  const autoSaveSeqRef = useRef(0);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usedCarsApi.listBackgroundCheckLeads({
        limit: 5000,
        includeClosed: "false",
      });
      const rows = safeArray(response?.data).map(mapApiLeadToDeskLead);
      setLeads(rows);
      setSelectedId((prev) =>
        prev && rows.some((entry) => entry.id === prev)
          ? prev
          : rows[0]?.id || null,
      );
    } catch (error) {
      message.error(
        error?.message || "Background check leads load karte waqt issue aaya.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId),
    [leads, selectedId],
  );

  const resolveStatusOnSave = useCallback(
    (values, requestedStatus) => {
      const rule = getHardRule(values);
      if (rule?.type === "auto-reject") {
        return {
          status: "REJECTED",
          autoRule: rule,
          reopened: false,
        };
      }

      if (
        selectedLead?.bgcStatus === "REJECTED" &&
        isAutoRejectedLead(selectedLead) &&
        (!requestedStatus || requestedStatus === "REJECTED")
      ) {
        return {
          status: BGC_STATUS.PENDING,
          autoRule: null,
          reopened: true,
        };
      }

      return {
        status: requestedStatus || BGC_STATUS.PENDING,
        autoRule: null,
        reopened: false,
      };
    },
    [selectedLead],
  );

  // Load form on lead change
  useEffect(() => {
    if (!selectedLead) return;
    const defaults = getDefaultBgcValues(selectedLead);
    const saved = selectedLead.bgcData || normalizeBgcFormValuesFromBackend(selectedLead);
    const merged = { ...defaults, ...saved };
    bgcForm.setFieldsValue(merged);
    setFormValues(merged);
  }, [selectedId, bgcForm, selectedLead]);

  const persistLead = useCallback(
    async (leadId, localStatus, values, options = {}) => {
      const serializedValues = serializeBgcFormValuesForBackend(values);
      const backendStatus = toBackendStatus(localStatus);
      const summary = buildBgcSummary(serializedValues);

      const payload = {
        status: backendStatus,
        formValues: serializedValues,
        evidenceVault: buildBgcEvidenceVault(serializedValues),
        summary,
        notes: serializedValues.serviceComments || serializedValues.vahanComments || "",
        updatedAt: new Date().toISOString(),
      };

      if (options.appendAudit) payload.appendAudit = options.appendAudit;
      if (options.activity) payload.activity = options.activity;
      if (typeof options.syncWorkflow === "boolean") {
        payload.syncWorkflow = options.syncWorkflow;
      }
      if (options.closureReason) payload.closureReason = options.closureReason;

      const updated = await usedCarsApi.saveBackgroundCheck(leadId, payload);
      const mapped = mapApiLeadToDeskLead(updated?.data);
      setLeads((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, ...mapped } : item)),
      );
      return mapped;
    },
    [],
  );

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (activeFilter !== "All") {
      list = list.filter((l) => l.bgcStatus === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          String(l.name || "").toLowerCase().includes(q) ||
          String(l.regNo || "").toLowerCase().includes(q) ||
          String(l.make || "").toLowerCase().includes(q) ||
          String(l.model || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeFilter, leads, search]);

  const queueFilters = useMemo(
    () => [
      { key: "All", label: "All", count: leads.length },
      {
        key: BGC_STATUS.PENDING,
        label: "Pending",
        count: leads.filter((l) => l.bgcStatus === BGC_STATUS.PENDING).length,
      },
      {
        key: BGC_STATUS.VAHAN_DONE,
        label: "Vahan Done",
        count: leads.filter((l) => l.bgcStatus === BGC_STATUS.VAHAN_DONE).length,
      },
      {
        key: BGC_STATUS.COMPLETE,
        label: "BGC Complete",
        count: leads.filter((l) => l.bgcStatus === BGC_STATUS.COMPLETE).length,
      },
      {
        key: "APPROVED",
        label: "Approved",
        count: leads.filter((l) => l.bgcStatus === "APPROVED").length,
      },
      {
        key: "ESCALATED",
        label: "Escalated",
        count: leads.filter((l) => l.bgcStatus === "ESCALATED").length,
      },
      {
        key: "REJECTED",
        label: "Rejected",
        count: leads.filter((l) => l.bgcStatus === "REJECTED").length,
      },
    ],
    [leads],
  );

  const handleValuesChange = useCallback(
    (_, all) => {
      setFormValues(all);
      if (!selectedId) return;
      const liveRule = getHardRule(all);
      setLeads((prev) =>
        prev.map((lead) => {
          if (lead.id !== selectedId) return lead;
          const nextLead = { ...lead, bgcData: all };
          if (
            !liveRule &&
            lead.bgcStatus === "REJECTED" &&
            isAutoRejectedLead(lead)
          ) {
            nextLead.bgcStatus = BGC_STATUS.PENDING;
          }
          return nextLead;
        }),
      );

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      const seq = ++autoSaveSeqRef.current;
      const timer = setTimeout(() => {
        if (!selectedId) return;
        let localStatus = selectedLead?.bgcStatus || BGC_STATUS.PENDING;
        if (
          !liveRule &&
          localStatus === "REJECTED" &&
          isAutoRejectedLead(selectedLead)
        ) {
          localStatus = BGC_STATUS.PENDING;
        }
        persistLead(selectedId, localStatus, all, { syncWorkflow: false }).catch(
          () => {
            if (seq === autoSaveSeqRef.current) {
              message.warning(
                "Auto-save miss hua. Manual Save Draft use kar sakte ho.",
              );
            }
          },
        );
      }, 1500);
      autoSaveTimerRef.current = timer;
    },
    [persistLead, selectedId, selectedLead],
  );

  const pushAuditEvent = useCallback((leadId, type, action, note = "") => {
    const ts = new Date().toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              auditTrail: [
                ...(l.auditTrail || []),
                { type, action, note, timestamp: ts, actor: "You" },
              ],
            }
          : l,
      ),
    );
  }, []);

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    },
    [],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const vals = bgcForm.getFieldsValue(true);
      const { status: nextStatus, autoRule, reopened } = resolveStatusOnSave(
        vals,
        selectedLead?.bgcStatus || BGC_STATUS.PENDING,
      );
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? { ...l, bgcData: vals, bgcStatus: nextStatus }
            : l,
        ),
      );
      const auditType = autoRule
        ? "auto_reject"
        : reopened
          ? "reopened"
          : "saved";
      const auditAction = autoRule
        ? "Auto-Rejected by System (on save)"
        : reopened
          ? "Re-opened after rule correction"
          : "Draft Saved";
      const auditNote = autoRule ? autoRule.reason : "";

      pushAuditEvent(selectedId, auditType, auditAction, auditNote);

      await persistLead(selectedId, nextStatus, vals, {
        appendAudit: {
          type: auditType,
          action: auditAction,
          note: auditNote,
          actor: "You",
          at: new Date().toISOString(),
        },
        activity: {
          type: "background-check",
          title: autoRule
            ? "Auto-rejected on save"
            : reopened
              ? "Background check re-opened"
              : "Background check draft saved",
          detail: autoRule
            ? autoRule.reason
            : reopened
              ? "Auto-reject trigger cleared and lead reopened."
              : "Draft saved from background-check desk.",
          actorName: "You",
          at: new Date().toISOString(),
        },
        syncWorkflow: true,
        closureReason: autoRule ? autoRule.reason : "",
      });
      message.success(
        autoRule
          ? "Auto-reject rule save ke baad apply ho gaya."
          : reopened
            ? "Lead reopened and saved successfully."
            : "Draft saved successfully",
      );
    } catch (error) {
      message.error(error?.message || "Draft save karte waqt issue aaya.");
    } finally {
      setSaving(false);
    }
  }, [
    bgcForm,
    persistLead,
    pushAuditEvent,
    resolveStatusOnSave,
    selectedId,
    selectedLead?.bgcStatus,
  ]);

  const handleMarkVahanDone = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const vals = bgcForm.getFieldsValue(true);
      const { status: nextStatus, autoRule } = resolveStatusOnSave(
        vals,
        BGC_STATUS.VAHAN_DONE,
      );
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? { ...l, bgcData: vals, bgcStatus: nextStatus }
            : l,
        ),
      );
      const auditType = autoRule ? "auto_reject" : "vahan_done";
      const auditAction = autoRule
        ? "Auto-Rejected by System (on save)"
        : "Vahan Check Completed";
      const auditNote = autoRule ? autoRule.reason : "";
      pushAuditEvent(selectedId, auditType, auditAction, auditNote);
      await persistLead(selectedId, nextStatus, vals, {
        appendAudit: {
          type: auditType,
          action: auditAction,
          note: auditNote,
          actor: "You",
          at: new Date().toISOString(),
        },
        activity: {
          type: "background-check",
          title: autoRule ? "Auto-rejected on save" : "Vahan check completed",
          detail: autoRule
            ? autoRule.reason
            : "Lead moved to service verification in background-check desk.",
          actorName: "You",
          at: new Date().toISOString(),
        },
        closureReason: autoRule ? autoRule.reason : "",
      });
      if (autoRule) {
        message.warning("Auto-reject rule save ke baad apply ho gaya.");
      } else {
        message.success("Vahan Check marked as done");
        setActiveTab("service");
      }
    } catch (error) {
      message.error(error?.message || "Vahan done update nahi ho paya.");
    } finally {
      setSaving(false);
    }
  }, [bgcForm, persistLead, pushAuditEvent, resolveStatusOnSave, selectedId]);

  const handleMarkComplete = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const vals = bgcForm.getFieldsValue(true);
      const { status: nextStatus, autoRule } = resolveStatusOnSave(
        vals,
        BGC_STATUS.COMPLETE,
      );
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? { ...l, bgcData: vals, bgcStatus: nextStatus }
            : l,
        ),
      );
      const auditType = autoRule ? "auto_reject" : "complete";
      const auditAction = autoRule
        ? "Auto-Rejected by System (on save)"
        : "Background Check Completed";
      const auditNote = autoRule ? autoRule.reason : "";
      pushAuditEvent(selectedId, auditType, auditAction, auditNote);
      await persistLead(selectedId, nextStatus, vals, {
        appendAudit: {
          type: auditType,
          action: auditAction,
          note: auditNote,
          actor: "You",
          at: new Date().toISOString(),
        },
        activity: {
          type: "background-check",
          title: autoRule
            ? "Auto-rejected on save"
            : "Background check completed",
          detail: autoRule
            ? autoRule.reason
            : "Lead cleared from background check.",
          actorName: "You",
          at: new Date().toISOString(),
        },
        closureReason: autoRule ? autoRule.reason : "",
      });
      message.success(
        autoRule
          ? "Auto-reject rule save ke baad apply ho gaya."
          : "Background Check completed!",
      );
    } catch (error) {
      message.error(error?.message || "Background check complete nahi ho paya.");
    } finally {
      setSaving(false);
    }
  }, [bgcForm, persistLead, pushAuditEvent, resolveStatusOnSave, selectedId]);

  const openActionModal = useCallback((type) => {
    setConfirmModal({ open: true, config: ACTION_CONFIGS[type] });
  }, []);

  const handleActionConfirm = useCallback(
    async (note) => {
      const cfg = confirmModal.config;
      if (!cfg || !selectedId) return;
      setSaving(true);
      try {
        const vals = bgcForm.getFieldsValue(true);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedId
              ? { ...l, bgcData: vals, bgcStatus: cfg.newStatus }
              : l,
          ),
        );
        pushAuditEvent(selectedId, cfg.auditType, cfg.auditAction, note);
        await persistLead(selectedId, cfg.newStatus, vals, {
          appendAudit: {
            type: cfg.auditType,
            action: cfg.auditAction,
            note,
            actor: "You",
            at: new Date().toISOString(),
          },
          activity: {
            type: "background-check",
            title: cfg.auditAction,
            detail: note || cfg.description,
            actorName: "You",
            at: new Date().toISOString(),
          },
          closureReason: cfg.newStatus === "REJECTED" ? note : undefined,
        });
        setConfirmModal({ open: false, config: null });
        message.success(`${cfg.auditAction} successfully`);
      } catch (error) {
        message.error(error?.message || "Action apply nahi ho paaya.");
      } finally {
        setSaving(false);
      }
    },
    [bgcForm, confirmModal, persistLead, pushAuditEvent, selectedId],
  );

  const hardRule = useMemo(() => getHardRule(formValues), [formValues]);
  const historyAvailable = formValues.serviceHistoryAvailable === "Yes";
  const hasHypothecation = formValues.hypothecation === "Yes";
  const hasChallan = formValues.challanPending === "Yes";
  const roadTaxSameAsRc = formValues.roadTaxSameAsRc;

  // Count stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      pending: leads.filter((l) => l.bgcStatus === BGC_STATUS.PENDING).length,
      vahanDone: leads.filter((l) => l.bgcStatus === BGC_STATUS.VAHAN_DONE)
        .length,
      complete: leads.filter((l) => l.bgcStatus === BGC_STATUS.COMPLETE).length,
      approved: leads.filter((l) => l.bgcStatus === "APPROVED").length,
      rejected: leads.filter((l) => l.bgcStatus === "REJECTED").length,
      escalated: leads.filter((l) => l.bgcStatus === "ESCALATED").length,
    }),
    [leads],
  );

  const commandDeck = (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-[#fdfefe] via-[#f8fbff] to-[#f7fefb] px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.38)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_10%,rgba(96,165,250,0.22),transparent_32%),radial-gradient(circle_at_90%_12%,rgba(244,114,182,0.15),transparent_28%),radial-gradient(circle_at_65%_100%,rgba(34,197,94,0.14),transparent_42%)]" />
      <div className="relative flex flex-col gap-3">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Background Check Desk
        </p>
        <h2 className="text-[22px] font-black tracking-tight text-slate-900 md:text-[26px]">
          Compliance & Risk Command Center
        </h2>
        <p className="max-w-3xl text-xs font-medium text-slate-600">
          Fast queue triage, legal checks, service validation, and audit-safe decisions.
          {` ${stats.total} vehicles currently in queue.`}
        </p>
      </div>
    </div>
  );

  // ── QUEUE PANEL ────────────────────────────────────────────
  const QueuePanel = (
    <div className="flex h-full flex-col gap-4">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.42)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <DashboardOutlined />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Queue
            </h2>
            <p className="text-xs text-slate-400">{stats.total} vehicles</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, reg, make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ClearOutlined />
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Filter by status
          </p>
          <div className="flex flex-wrap gap-2">
            {queueFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                  activeFilter === filter.key
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    activeFilter === filter.key
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lead List */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12">
            <FilterOutlined className="mb-3 text-2xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">
              No matches found
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveFilter("All");
              }}
              className="mt-2 text-xs text-blue-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <QueueCard
              key={lead.id}
              lead={lead}
              active={selectedId === lead.id}
              onClick={() => {
                setSelectedId(lead.id);
                setActiveTab("vahan");
              }}
            />
          ))
        )}
      </div>
    </div>
  );

  // ── VAHAN TAB ──────────────────────────────────────────────
  const VahanTab = (
    <div className="space-y-5">
      <VahanSnapshot values={formValues} lead={selectedLead} />

      <SectionCard title="Vehicle Identity" icon={<CarOutlined />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Form.Item label="Owner Name" name="ownerName" className="!mb-0">
            <Input placeholder="As per RC / Vahan" className="!rounded-xl" />
          </Form.Item>
          <Form.Item
            label="Ownership Serial No."
            name="ownershipSerialNo"
            className="!mb-0"
          >
            <Select
              placeholder="Select ownership..."
              options={OWNERSHIP_SERIAL_OPTS.map((o) => ({
                value: o,
                label: o,
              }))}
              className="!rounded-xl"
            />
          </Form.Item>
          <Form.Item label="Make" name="make" className="!mb-0">
            <Input placeholder="e.g. Hyundai" className="!rounded-xl" />
          </Form.Item>
          <Form.Item label="Model" name="model" className="!mb-0">
            <Input placeholder="e.g. i20" className="!rounded-xl" />
          </Form.Item>
          <Form.Item label="Variant" name="variant" className="!mb-0">
            <Input placeholder="e.g. Sportz 1.4 AT" className="!rounded-xl" />
          </Form.Item>
          <Form.Item label="Fuel Type" name="fuelType" className="!mb-0">
            <Select
              placeholder="Select fuel..."
              options={FUEL_TYPE_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
          <Form.Item label="Mfg Year" name="mfgYear" className="!mb-0">
            <Input placeholder="e.g. 2021" className="!rounded-xl" />
          </Form.Item>
        </div>
      </SectionCard>

      <SectionCard title="Registration & Dates" icon={<CalendarOutlined />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Form.Item
            label="Registration Date"
            name="regdDate"
            className="!mb-0"
          >
            <DatePicker className="!w-full !rounded-xl" format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item label="RC Expiry" name="rcExpiry" className="!mb-0">
            <DatePicker className="!w-full !rounded-xl" format="DD MMM YYYY" />
          </Form.Item>
          <div>
            <Form.Item
              label="Road Tax Expiry"
              name="roadTaxExpiry"
              className="!mb-2"
            >
              <DatePicker
                className="!w-full !rounded-xl"
                format="DD MMM YYYY"
                disabled={roadTaxSameAsRc}
              />
            </Form.Item>
            <Form.Item
              name="roadTaxSameAsRc"
              valuePropName="checked"
              className="!mb-0"
            >
              <Checkbox>Same as RC Expiry</Checkbox>
            </Form.Item>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Hypothecation" icon={<BankOutlined />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item
            label="Hypothecation"
            name="hypothecation"
            className="!mb-0"
          >
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
          {hasHypothecation && (
            <Form.Item
              label="Hypothecation Bank"
              name="hypothecationBank"
              className="!mb-0"
            >
              <Input placeholder="e.g. HDFC Bank" className="!rounded-xl" />
            </Form.Item>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Legal Status" icon={<SafetyCertificateOutlined />}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <Form.Item
              label={
                <span className="flex items-center gap-2">
                  Blacklisted
                  {formValues.blacklisted === "Yes" && (
                    <Tag color="red" className="!m-0 !text-[9px] font-black">
                      Auto-Reject
                    </Tag>
                  )}
                </span>
              }
              name="blacklisted"
              className="!mb-2"
            >
              <Radio.Group>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
              </Radio.Group>
            </Form.Item>
            {formValues.blacklisted === "Yes" && (
              <Form.Item
                name="blacklistedFiles"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                className="!mb-0"
              >
                <EvidenceUpload label="Blacklist Proof" maxCount={3} />
              </Form.Item>
            )}
          </div>

          <div className="space-y-3">
            <Form.Item
              label={
                <span className="flex items-center gap-2">
                  Theft Record
                  {formValues.theft === "Yes" && (
                    <Tag color="red" className="!m-0 !text-[9px] font-black">
                      Auto-Reject
                    </Tag>
                  )}
                </span>
              }
              name="theft"
              className="!mb-2"
            >
              <Radio.Group>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
              </Radio.Group>
            </Form.Item>
            {formValues.theft === "Yes" && (
              <Form.Item
                name="theftFiles"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                className="!mb-0"
              >
                <EvidenceUpload label="Theft Proof" maxCount={3} />
              </Form.Item>
            )}
          </div>

          <Form.Item
            label="Road Tax Status"
            name="roadTaxStatus"
            className="!mb-0"
          >
            <Select
              placeholder="Select status..."
              options={ROAD_TAX_STATUS_OPTS.map((o) => ({
                value: o,
                label: o,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="RTO NOC Issued"
            name="rtoNocIssued"
            className="!mb-0"
          >
            <Select
              placeholder="Select NOC status..."
              options={NOC_STATUS_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
        </div>
      </SectionCard>

      <SectionCard title="Challan Status" icon={<ThunderboltOutlined />}>
        <Form.Item
          label="Challan Pending?"
          name="challanPending"
          className="!mb-0"
        >
          <Radio.Group>
            <Radio value="Yes">Yes</Radio>
            <Radio value="No">No</Radio>
          </Radio.Group>
        </Form.Item>
        {hasChallan && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ChallanCard
              title="eChallan (Central)"
              icon={<SearchOutlined />}
              countName="echallanCount"
              amountName="echallanAmount"
              filesName="echallanFiles"
              values={formValues}
              colorScheme="amber"
            />
            <ChallanCard
              title="Delhi Traffic Police"
              icon={<SearchOutlined />}
              countName="dtpCount"
              amountName="dtpAmount"
              filesName="dtpFiles"
              values={formValues}
              colorScheme="rose"
            />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Party Peshi & Comments"
        icon={<EditOutlined />}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <Form.Item
            label="Party Peshi Applicability"
            name="partyPeshi"
            className="!mb-0"
          >
            <Select
              placeholder="Select applicability..."
              options={PARTY_PESHI_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
          {formValues.partyPeshi?.includes("Applicable") && (
            <Form.Item
              label="Peshi Detail"
              name="partyPeshiDetail"
              className="!mb-0"
            >
              <Input
                placeholder="Court / date / case detail"
                className="!rounded-xl"
              />
            </Form.Item>
          )}
          <Form.Item
            label="Vahan Comments"
            name="vahanComments"
            className="!mb-0"
          >
            <TextArea
              rows={3}
              placeholder="Any remarks on the Vahan check..."
            />
          </Form.Item>
        </div>
      </SectionCard>
    </div>
  );

  // ── SERVICE TAB ────────────────────────────────────────────
  const ServiceTab = (
    <div className="space-y-5">
      <ServiceSnapshot values={formValues} />

      <SectionCard title="Service History" icon={<HistoryOutlined />}>
        <div className="space-y-4">
          <Form.Item
            label="Service History Available?"
            name="serviceHistoryAvailable"
            className="!mb-0"
          >
            <Radio.Group>
              {SERVICE_HISTORY_OPTS.map((o) => (
                <Radio key={o} value={o}>
                  {o}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {historyAvailable && (
            <>
              <Form.Item
                label="Any Accident History?"
                name="accidentHistory"
                className="!mb-0"
              >
                <Select
                  placeholder="Select..."
                  options={ACCIDENT_HISTORY_OPTS.map((o) => ({
                    value: o,
                    label: o,
                  }))}
                />
              </Form.Item>

              <div className="grid gap-4 md:grid-cols-2">
                <Form.Item
                  label="Last Service Date"
                  name="lastServiceDate"
                  className="!mb-0"
                >
                  <DatePicker
                    className="!w-full !rounded-xl"
                    format="DD MMM YYYY"
                  />
                </Form.Item>
                <Form.Item
                  label="Last Service Odometer (km)"
                  name="lastServiceOdometer"
                  className="!mb-0"
                >
                  <InputNumber
                    min={0}
                    placeholder="e.g. 45000"
                    className="!w-full !rounded-xl"
                    formatter={(v) =>
                      v ? Number(v).toLocaleString("en-IN") : ""
                    }
                    parser={(v) => v?.replace(/,/g, "")}
                  />
                </Form.Item>
                <Form.Item
                  label="Current Odometer (km)"
                  name="currentOdometer"
                  className="!mb-0"
                >
                  <InputNumber
                    min={0}
                    placeholder="e.g. 52000"
                    className="!w-full !rounded-xl"
                    formatter={(v) =>
                      v ? Number(v).toLocaleString("en-IN") : ""
                    }
                    parser={(v) => v?.replace(/,/g, "")}
                  />
                </Form.Item>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Service Record Proof
                </label>
                <Form.Item
                  name="serviceFiles"
                  valuePropName="fileList"
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e?.fileList
                  }
                  className="!mb-0"
                >
                  <EvidenceUpload label="Service Bill / Log" maxCount={5} />
                </Form.Item>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Vehicle History Flags" icon={<WarningFilled />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item
            label="Odometer Status"
            name="odometerStatus"
            className="!mb-0"
          >
            <Select
              placeholder="Select odometer status..."
              options={ODOMETER_STATUS_OPTS.map((o) => ({
                value: o,
                label: o,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-2">
                Flooded Car?
                {formValues.floodedCar === "Yes" && (
                  <Tag color="orange" className="!m-0 !text-[9px] font-black">
                    Manual Review
                  </Tag>
                )}
              </span>
            }
            name="floodedCar"
            className="!mb-0"
          >
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Total Loss Vehicle?"
            name="totalLossVehicle"
            className="!mb-0"
          >
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Migrated Vehicle?"
            name="migratedVehicle"
            className="!mb-0"
          >
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
      </SectionCard>

      <SectionCard
        title="Service Comments"
        icon={<EditOutlined />}
        defaultOpen={false}
      >
        <Form.Item
          label="Service History Comments"
          name="serviceComments"
          className="!mb-0"
        >
          <TextArea
            rows={3}
            placeholder="Any remarks about service records, odometer discrepancy, history flags..."
          />
        </Form.Item>
      </SectionCard>
    </div>
  );

  // ── AUDIT TAB ──────────────────────────────────────────────
  const AuditTab = (
    <div className="space-y-5">
      <SectionCard title="Audit Trail" icon={<HistoryOutlined />}>
        <AuditTimeline events={selectedLead?.auditTrail || []} />
      </SectionCard>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <SyncOutlined spin />
            Loading background-check queue...
          </div>
        </div>
      </section>
    );
  }

  // ── EMPTY STATE ────────────────────────────────────────────
  if (!selectedId) {
    return (
      <section className="space-y-4">
        {commandDeck}
        <div className="grid gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
          <div>{QueuePanel}</div>

          <div className="flex min-h-[500px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
                <FileSearchOutlined className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                Select a Vehicle
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Choose a vehicle from the queue to begin the background check
                process.
              </p>

              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-500">
                    {stats.pending}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Pending
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-black text-sky-500">
                    {stats.vahanDone}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Vahan
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-500">
                    {stats.complete}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  return (
    <section className="space-y-4">
      {commandDeck}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        {/* Left — Queue */}
        <div>{QueuePanel}</div>

        {/* Right — BGC Form */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)]">
          {/* Header */}
          <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-sky-50/60 via-white to-emerald-50/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Background Check
                  </p>
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  {selectedLead?.make} {selectedLead?.model}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-slate-500">
                  {selectedLead?.regNo} · {selectedLead?.variant}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <StatusBadge status={selectedLead?.bgcStatus} />
                  <InspectionScore score={selectedLead?.inspectionScore} />
                  <span className="text-xs text-slate-400">
                    {selectedLead?.name} · {selectedLead?.assignedTo}
                  </span>
                </div>
              </div>

              <ActionButtons
                onApprove={() => openActionModal("approve")}
                onReject={() => openActionModal("reject")}
                onEscalate={() => openActionModal("escalate")}
                saving={saving}
                disabled={hardRule?.type === "auto-reject"}
              />
            </div>
          </div>

          {/* Alert */}
          {hardRule && (
            <div className="px-5 pt-4">
              <HardRuleAlert rule={hardRule} />
            </div>
          )}

          {/* Form Content */}
          <div className="p-5">
            <Form
              form={bgcForm}
              layout="vertical"
              size="middle"
              onValuesChange={handleValuesChange}
            >
              <div className="mb-4">
                <SectionCard title="Evidence Vault" icon={<PaperClipOutlined />}>
                  <SmartEvidenceViewer values={formValues} />
                </SectionCard>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="bgc-tabs"
                items={[
                  {
                    key: "vahan",
                    label: (
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <CarOutlined />
                        Vahan Check
                      </span>
                    ),
                    children: VahanTab,
                  },
                  {
                    key: "service",
                    label: (
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <HistoryOutlined />
                        Service History
                      </span>
                    ),
                    children: ServiceTab,
                  },
                  {
                    key: "audit",
                    label: (
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <HistoryOutlined />
                        Audit Trail
                        {(selectedLead?.auditTrail || []).length > 0 && (
                          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">
                            {selectedLead.auditTrail.length}
                          </span>
                        )}
                      </span>
                    ),
                    children: AuditTab,
                  },
                ]}
              />

              {/* Sticky Footer */}
              <div className="sticky bottom-4 z-50 mt-6">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedLead?.bgcStatus} />
                    <span className="text-xs text-slate-400">
                      Last updated:{" "}
                      {selectedLead?.auditTrail?.[
                        selectedLead.auditTrail.length - 1
                      ]?.timestamp || "Just now"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      icon={<SaveOutlined />}
                      onClick={handleSaveDraft}
                      loading={saving}
                      className="!flex !items-center !gap-2 !rounded-xl !px-4 !py-2"
                    >
                      Save Draft
                    </Button>

                    {activeTab === "vahan" &&
                      selectedLead?.bgcStatus === BGC_STATUS.PENDING && (
                        <Button
                          onClick={handleMarkVahanDone}
                          loading={saving}
                          icon={<RightOutlined />}
                          className="!flex !items-center !gap-2 !rounded-xl !border-sky-300 !bg-sky-50 !px-4 !py-2 !font-semibold !text-sky-700 hover:!bg-sky-100"
                        >
                          Mark Vahan Done
                        </Button>
                      )}

                    {(selectedLead?.bgcStatus === BGC_STATUS.VAHAN_DONE ||
                      activeTab === "service") && (
                      <Button
                        type="primary"
                        onClick={handleMarkComplete}
                        loading={saving}
                        icon={<CheckOutlined />}
                        className="!flex !items-center !gap-2 !rounded-xl !bg-emerald-500 !px-5 !py-2 !font-bold hover:!bg-emerald-600"
                      >
                        Mark BGC Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        config={confirmModal.config}
        onConfirm={handleActionConfirm}
        onCancel={() => setConfirmModal({ open: false, config: null })}
      />
    </section>
  );
}
