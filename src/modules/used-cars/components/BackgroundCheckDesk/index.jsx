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
  Progress,
  Radio,
  Select,
  Steps,
  Tag,
  Tabs,
  Tooltip,
  Upload,
  message,
  Badge,
  Alert,
  Statistic,
  Card,
} from "antd";
import {
  SaveOutlined,
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  FileSearchOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowUpOutlined,
  CarOutlined,
  DownOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BankOutlined,
  WarningFilled,
  StopFilled,
  InfoCircleOutlined,
  SyncOutlined,
  FilterOutlined,
  HolderOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  UserSwitchOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  PauseCircleOutlined,
  RightOutlined,
  LeftOutlined,
  FilterFilled,
  SortAscendingOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  BGC_STORAGE_KEY,
  BGC_SAMPLE_LEADS,
  BGC_QUEUE_FILTERS,
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

const { TextArea } = Input;
const { Dragger } = Upload;

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS & THEME
// ═══════════════════════════════════════════════════════════════════════════════
const theme = {
  colors: {
    primary: {
      DEFAULT: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
    },
    success: {
      DEFAULT: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    warning: {
      DEFAULT: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    danger: {
      DEFAULT: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    info: {
      DEFAULT: "#06b6d4",
      light: "#22d3ee",
      dark: "#0891b2",
    },
    violet: {
      DEFAULT: "#8b5cf6",
      light: "#a78bfa",
      dark: "#7c3aed",
    },
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    glow: {
      blue: "0 0 20px rgba(59, 130, 246, 0.25)",
      green: "0 0 20px rgba(16, 185, 129, 0.25)",
      red: "0 0 20px rgba(239, 68, 68, 0.25)",
    },
  },
  radii: {
    sm: "6px",
    DEFAULT: "10px",
    md: "14px",
    lg: "20px",
    xl: "28px",
    full: "9999px",
  },
  transitions: {
    fast: "150ms ease",
    DEFAULT: "200ms ease",
    slow: "300ms ease",
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
// PROGRESS STEPS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function BGCProgressSteps({ currentStatus }) {
  const steps = [
    {
      key: BGC_STATUS.PENDING,
      title: "Pending",
      icon: <ClockCircleOutlined />,
    },
    {
      key: BGC_STATUS.VAHAN_DONE,
      title: "Vahan Done",
      icon: <CheckCircleFilled />,
    },
    {
      key: BGC_STATUS.COMPLETE,
      title: "Complete",
      icon: <CheckSquareOutlined />,
    },
  ];

  const statusOrder = [
    BGC_STATUS.PENDING,
    BGC_STATUS.VAHAN_DONE,
    BGC_STATUS.COMPLETE,
  ];
  const currentIndex = statusOrder.indexOf(currentStatus);

  // Handle APPROVED/REJECTED/ESCALATED states
  if (["APPROVED", "REJECTED", "ESCALATED"].includes(currentStatus)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-white/5">
        <div
          className={`flex items-center gap-2 ${currentStatus === "APPROVED" ? "text-emerald-600" : currentStatus === "REJECTED" ? "text-red-600" : "text-violet-600"}`}
        >
          {currentStatus === "APPROVED" ? (
            <CheckCircleFilled />
          ) : currentStatus === "REJECTED" ? (
            <CloseOutlined />
          ) : (
            <ArrowUpOutlined />
          )}
          <span className="text-sm font-bold capitalize">
            {currentStatus.toLowerCase()}
          </span>
        </div>
        <span className="text-xs text-slate-400">— Final Status</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-white/5">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                      : "bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500"
                }`}
              >
                {isCompleted ? <CheckOutlined /> : step.icon}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded-full ${
                  isCompleted
                    ? "bg-emerald-400"
                    : "bg-slate-200 dark:bg-white/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
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
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    green:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    purple:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
              <span className="text-slate-500 dark:text-slate-400">{icon}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
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
            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 transition-transform duration-200 dark:bg-white/10 ${open ? "rotate-180" : ""}`}
          >
            <DownOutlined className="text-[10px] text-slate-500" />
          </div>
        </div>
      </button>

      <div
        className={`transition-all duration-300 ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="border-t border-slate-100 px-5 py-5 dark:border-white/5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FIELD ROW
// ═══════════════════════════════════════════════════════════════════════════════
function DataField({ label, value, flag, hasFile, onFileClick }) {
  return (
    <div className="group relative">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {flag === true && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <ExclamationCircleFilled className="text-[10px] text-red-500" />
            </div>
          )}
          {flag === false && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <CheckCircleFilled className="text-[10px] text-emerald-500" />
            </div>
          )}
          <p
            className={`text-sm font-bold transition-colors ${
              flag === true
                ? "text-red-600 dark:text-red-400"
                : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {value}
          </p>
        </div>

        {hasFile && (
          <button
            onClick={onFileClick}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 opacity-0 transition-all hover:bg-sky-200 group-hover:opacity-100 dark:bg-sky-500/20 dark:hover:bg-sky-500/30"
          >
            <EyeOutlined className="text-[10px] text-sky-600 dark:text-sky-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAHAN SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function VahanSnapshot({ values, lead }) {
  const totalChallan = (values.echallanAmount || 0) + (values.dtpAmount || 0);
  const hasChallan = values.challanPending === "Yes";

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10 dark:from-white/5 dark:to-transparent">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Owner
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {values.ownerName || lead?.name || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10 dark:from-white/5 dark:to-transparent">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Vehicle
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {[values.make, values.model].filter(Boolean).join(" ") || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10 dark:from-white/5 dark:to-transparent">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Reg. Year
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            {values.mfgYear || lead?.mfgYear || "—"}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 transition-colors ${
            hasChallan
              ? "border-red-200 bg-gradient-to-br from-red-50 to-white dark:border-red-500/30 dark:from-red-500/5 dark:to-transparent"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-500/30 dark:from-emerald-500/5 dark:to-transparent"
          }`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${hasChallan ? "text-red-500" : "text-emerald-600"}`}
          >
            Challan
          </p>
          <p
            className={`mt-1 text-sm font-bold ${hasChallan ? "text-red-600" : "text-emerald-600"}`}
          >
            {hasChallan ? `₹${totalChallan.toLocaleString("en-IN")}` : "Clear"}
          </p>
        </div>
      </div>

      {/* Key Details Grid */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Quick Overview
          </p>
          <Tag
            className="!m-0"
            color={values.hypothecation === "Yes" ? "orange" : "green"}
          >
            {values.hypothecation === "Yes" ? "Financed" : "Clear"}
          </Tag>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <DataField
            label="Ownership"
            value={values.ownershipSerialNo || "—"}
            flag={false}
          />
          <DataField
            label="Fuel Type"
            value={values.fuelType || "—"}
            flag={false}
          />
          <DataField
            label="RC Expiry"
            value={
              values.rcExpiry
                ? dayjs(values.rcExpiry).format("DD MMM YYYY")
                : "—"
            }
            flag={false}
          />
          <DataField
            label="Road Tax"
            value={values.roadTaxStatus || "—"}
            flag={false}
          />
          <DataField
            label="Blacklisted"
            value={values.blacklisted || "—"}
            flag={values.blacklisted === "Yes"}
            hasFile={(values.blacklistedFiles || []).length > 0}
            onFileClick={() => {
              const file = (values.blacklistedFiles || [])[0];
              if (file?.url || file?.preview)
                window.open(file.url || file.preview, "_blank");
            }}
          />
          <DataField
            label="Theft Record"
            value={values.theft || "—"}
            flag={values.theft === "Yes"}
            hasFile={(values.theftFiles || []).length > 0}
            onFileClick={() => {
              const file = (values.theftFiles || [])[0];
              if (file?.url || file?.preview)
                window.open(file.url || file.preview, "_blank");
            }}
          />
          <DataField
            label="RTO NOC"
            value={values.rtoNocIssued || "—"}
            flag={false}
          />
          <DataField
            label="Party Peshi"
            value={values.partyPeshi || "—"}
            flag={values.partyPeshi?.includes("Applicable")}
          />
        </div>
      </div>

      {/* Document Hub */}
      {(values.blacklistedFiles?.length > 0 ||
        values.theftFiles?.length > 0 ||
        values.echallanFiles?.length > 0 ||
        values.dtpFiles?.length > 0) && (
        <div className="rounded-2xl border border-sky-200/50 bg-gradient-to-r from-sky-50/50 to-transparent p-4 dark:border-sky-500/20 dark:from-sky-500/5">
          <div className="mb-3 flex items-center gap-2">
            <PaperClipOutlined className="text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Document Hub
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "blacklistedFiles",
                label: "Blacklist",
                count: values.blacklistedFiles?.length,
              },
              {
                key: "theftFiles",
                label: "Theft",
                count: values.theftFiles?.length,
              },
              {
                key: "echallanFiles",
                label: "eChallan",
                count: values.echallanFiles?.length,
              },
              { key: "dtpFiles", label: "DTP", count: values.dtpFiles?.length },
            ].map((doc) => {
              if (!values[doc.key]?.length) return null;
              return (
                <button
                  key={doc.key}
                  onClick={() => {
                    const url =
                      values[doc.key][0]?.url || values[doc.key][0]?.preview;
                    if (url) window.open(url, "_blank");
                  }}
                  className="group flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 transition-all hover:border-sky-400 hover:shadow-sm dark:border-sky-500/30 dark:bg-white/5"
                >
                  <FileTextOutlined className="text-sky-500" />
                  <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    {doc.label}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                    {doc.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {values.vahanComments && (
        <div className="rounded-2xl border border-slate-200 bg-amber-50/30 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <EditOutlined className="text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Comments
            </p>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {values.vahanComments}
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function ServiceSnapshot({ values }) {
  const rows = [
    {
      label: "Service History",
      value: values.serviceHistoryAvailable || "—",
      flag: values.serviceHistoryAvailable === "No",
    },
    {
      label: "Accident History",
      value: values.accidentHistory || "—",
      flag: values.accidentHistory && values.accidentHistory !== "None",
    },
    {
      label: "Last Service",
      value: values.lastServiceDate
        ? dayjs(values.lastServiceDate).format("DD MMM YYYY")
        : "—",
      flag: false,
    },
    {
      label: "Odometer",
      value: values.currentOdometer
        ? `${Number(values.currentOdometer).toLocaleString("en-IN")} km`
        : "—",
      flag: false,
    },
    {
      label: "Odometer Status",
      value: values.odometerStatus || "—",
      flag: values.odometerStatus && values.odometerStatus !== "Not Tampered",
    },
    {
      label: "Flooded Car",
      value: values.floodedCar || "—",
      flag: values.floodedCar === "Yes",
    },
    {
      label: "Total Loss",
      value: values.totalLossVehicle || "—",
      flag: values.totalLossVehicle === "Yes",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className={`rounded-2xl border p-4 transition-colors ${
            values.floodedCar === "Yes"
              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-500/30"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-500/30"
          }`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${values.floodedCar === "Yes" ? "text-amber-600" : "text-emerald-600"}`}
          >
            Flood Status
          </p>
          <p
            className={`mt-1 text-sm font-bold ${values.floodedCar === "Yes" ? "text-amber-600" : "text-emerald-600"}`}
          >
            {values.floodedCar === "Yes" ? "Affected" : "Clear"}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 transition-colors ${
            values.totalLossVehicle === "Yes"
              ? "border-red-200 bg-gradient-to-br from-red-50 to-white dark:border-red-500/30"
              : "border-slate-200 bg-gradient-to-br from-slate-50 to-white dark:border-white/10"
          }`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider ${values.totalLossVehicle === "Yes" ? "text-red-600" : "text-slate-500"}`}
          >
            Total Loss
          </p>
          <p
            className={`mt-1 text-sm font-bold ${values.totalLossVehicle === "Yes" ? "text-red-600" : "text-slate-700 dark:text-slate-300"}`}
          >
            {values.totalLossVehicle === "Yes" ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Service Available
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
            {values.serviceHistoryAvailable || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Odometer
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
            {values.odometerStatus || "—"}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map(({ label, value, flag }) => (
            <DataField key={label} label={label} value={value} flag={flag} />
          ))}
        </div>
      </div>

      {values.serviceFiles?.length > 0 && (
        <div className="rounded-2xl border border-sky-200/50 bg-gradient-to-r from-sky-50/50 to-transparent p-4 dark:border-sky-500/20 dark:from-sky-500/5">
          <div className="flex items-center gap-2 mb-3">
            <PaperClipOutlined className="text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Service Documents ({values.serviceFiles.length})
            </p>
          </div>
          <button
            onClick={() => {
              const url =
                values.serviceFiles[0]?.url || values.serviceFiles[0]?.preview;
              if (url) window.open(url, "_blank");
            }}
            className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            <FileTextOutlined />
            <span className="font-semibold">View Service Records</span>
          </button>
        </div>
      )}

      {values.serviceComments && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <EditOutlined className="text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Comments
            </p>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {values.serviceComments}
          </p>
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
    <div className="relative space-y-0">
      {events.map((event, idx) => {
        const cfg = typeConfig[event.type] || typeConfig.info;
        const isLast = idx === events.length - 1;

        return (
          <div key={idx} className="relative flex gap-4 pb-6">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${cfg.bg}`}
              >
                {cfg.icon}
              </div>
              {!isLast && (
                <div className="mt-3 h-full w-0.5 flex-1 bg-gradient-to-b from-slate-200 to-transparent dark:from-white/10" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {event.action}
                  </p>
                  {event.actor && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      by {event.actor}
                    </p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {event.timestamp}
                </span>
              </div>

              {event.note && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {event.note}
                  </p>
                </div>
              )}
            </div>
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
            className="!flex !items-center !gap-2 !rounded-xl !border-emerald-300 !bg-emerald-50 !px-4 !py-2 !text-sm !font-bold !text-emerald-700 transition-all hover:!border-emerald-400 hover:!bg-emerald-100 hover:shadow-sm disabled:!opacity-50 dark:!border-emerald-500/30 dark:!bg-emerald-500/10 dark:!text-emerald-400"
            icon={<CheckOutlined />}
          >
            Approve
          </Button>
        </span>
      </Tooltip>

      <Button
        onClick={onReject}
        loading={saving}
        className="!flex !items-center !gap-2 !rounded-xl !border-red-200 !bg-red-50 !px-4 !py-2 !text-sm !font-bold !text-red-600 transition-all hover:!border-red-300 hover:!bg-red-100 hover:shadow-sm dark:!border-red-500/30 dark:!bg-red-500/10 dark:!text-red-400"
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
            className="!flex !items-center !gap-2 !rounded-xl !border-violet-200 !bg-violet-50 !px-4 !py-2 !text-sm !font-bold !text-violet-700 transition-all hover:!border-violet-300 hover:!bg-violet-100 hover:shadow-sm disabled:!opacity-50 dark:!border-violet-500/30 dark:!bg-violet-500/10 dark:!text-violet-400"
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? "border-blue-400 bg-blue-50/50 shadow-lg ring-2 ring-blue-100 dark:border-blue-500/50 dark:bg-blue-500/10 dark:ring-blue-500/20"
          : "border-slate-200/80 bg-white shadow-sm hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {lead.make} {lead.model}
            </h4>
            {rule?.type === "auto-reject" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <StopFilled className="text-[10px] text-red-500" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lead.variant} · {lead.mfgYear}
          </p>
          <p className="mt-1.5 text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300">
            {lead.regNo}
          </p>
        </div>

        <InspectionScore score={lead.inspectionScore} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
          {lead.assignedTo}
        </p>
        <StatusBadge status={lead.bgcStatus} size="small" />
      </div>

      {rule && rule.type !== "auto-reject" && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 dark:border-amber-500/20 dark:bg-amber-500/10">
          <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
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
  return (
    <Upload
      listType="picture-card"
      fileList={fileList}
      onPreview={(file) => {
        if (file.url || file.preview)
          window.open(file.url || file.preview, "_blank");
      }}
      onChange={({ fileList: newFileList }) => onChange(newFileList)}
      beforeUpload={() => false}
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
  const [leads, setLeads] = useState(() => {
    try {
      const stored = localStorage.getItem(BGC_STORAGE_KEY);
      return stored ? JSON.parse(stored) : BGC_SAMPLE_LEADS;
    } catch {
      return BGC_SAMPLE_LEADS;
    }
  });

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
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Persist leads
  useEffect(() => {
    try {
      localStorage.setItem(BGC_STORAGE_KEY, JSON.stringify(leads));
    } catch {}
  }, [leads]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId),
    [leads, selectedId],
  );

  // Load form on lead change
  useEffect(() => {
    if (!selectedLead) return;
    const defaults = getDefaultBgcValues(selectedLead);
    const saved = selectedLead.bgcData || {};
    const merged = { ...defaults, ...saved };
    bgcForm.setFieldsValue(merged);
    setFormValues(merged);
  }, [selectedId, bgcForm, selectedLead]);

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (activeFilter !== "All")
      list = list.filter((l) => l.bgcStatus === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.regNo.toLowerCase().includes(q) ||
          l.make.toLowerCase().includes(q) ||
          l.model.toLowerCase().includes(q),
      );
    }
    return list;
  }, [leads, activeFilter, search]);

  const handleValuesChange = useCallback(
    (_, all) => {
      setFormValues(all);

      // Auto-save after 2 seconds of inactivity
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => {
        if (selectedId) {
          setLeads((prev) =>
            prev.map((l) => (l.id === selectedId ? { ...l, bgcData: all } : l)),
          );
        }
      }, 2000);
      setAutoSaveTimer(timer);
    },
    [selectedId, autoSaveTimer],
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

  const handleSaveDraft = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    const vals = bgcForm.getFieldsValue(true);
    setLeads((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, bgcData: vals } : l)),
    );
    pushAuditEvent(selectedId, "saved", "Draft Saved");
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Draft saved successfully");
  }, [bgcForm, selectedId, pushAuditEvent]);

  const handleMarkVahanDone = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    const vals = bgcForm.getFieldsValue(true);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? { ...l, bgcData: vals, bgcStatus: BGC_STATUS.VAHAN_DONE }
          : l,
      ),
    );
    pushAuditEvent(selectedId, "vahan_done", "Vahan Check Completed");
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Vahan Check marked as done");
    setActiveTab("service");
  }, [bgcForm, selectedId, pushAuditEvent]);

  const handleMarkComplete = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    const vals = bgcForm.getFieldsValue(true);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? { ...l, bgcData: vals, bgcStatus: BGC_STATUS.COMPLETE }
          : l,
      ),
    );
    pushAuditEvent(selectedId, "complete", "Background Check Completed");
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Background Check completed!");
  }, [bgcForm, selectedId, pushAuditEvent]);

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

  const openActionModal = useCallback((type) => {
    setConfirmModal({ open: true, config: ACTION_CONFIGS[type] });
  }, []);

  const handleActionConfirm = useCallback(
    (note) => {
      const cfg = confirmModal.config;
      if (!cfg || !selectedId) return;
      const vals = bgcForm.getFieldsValue(true);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? { ...l, bgcData: vals, bgcStatus: cfg.newStatus }
            : l,
        ),
      );
      pushAuditEvent(selectedId, cfg.auditType, cfg.auditAction, note);
      setConfirmModal({ open: false, config: null });
      message.success(`${cfg.auditAction} successfully`);
    },
    [confirmModal, selectedId, bgcForm, pushAuditEvent],
  );

  const hardRule = useMemo(() => getHardRule(formValues), [formValues]);
  const historyAvailable = formValues.serviceHistoryAvailable === "Yes";
  const hasHypothecation = formValues.hypothecation === "Yes";
  const hasChallan = formValues.challanPending === "Yes";
  const roadTaxSameAsRc = formValues.roadTaxSameAsRc;

  // Auto-reject trigger
  useEffect(() => {
    if (!selectedId || !hardRule || hardRule.type !== "auto-reject") return;
    const lead = leads.find((l) => l.id === selectedId);
    if (!lead) return;
    if (lead.bgcStatus === "REJECTED" || lead.bgcStatus === "APPROVED") return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedId ? { ...l, bgcStatus: "REJECTED" } : l,
      ),
    );
    pushAuditEvent(
      selectedId,
      "auto_reject",
      "Auto-Rejected by System",
      hardRule.reason,
    );
  }, [hardRule, selectedId]);

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

  // ── QUEUE PANEL ────────────────────────────────────────────
  const QueuePanel = (
    <div className="flex h-full flex-col gap-4">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <DashboardOutlined />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              BGC Queue
            </h2>
            <p className="text-xs text-slate-400">{stats.total} vehicles</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center dark:bg-amber-500/10">
            <p className="text-lg font-black text-amber-600">{stats.pending}</p>
            <p className="text-[9px] font-semibold text-amber-500 uppercase">
              Pending
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 px-3 py-2 text-center dark:bg-sky-500/10">
            <p className="text-lg font-black text-sky-600">{stats.vahanDone}</p>
            <p className="text-[9px] font-semibold text-sky-500 uppercase">
              Vahan
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center dark:bg-emerald-500/10">
            <p className="text-lg font-black text-emerald-600">
              {stats.complete}
            </p>
            <p className="text-[9px] font-semibold text-emerald-500 uppercase">
              Complete
            </p>
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
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

        {/* Filters */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <FilterOutlined className="text-[10px] text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Filter by Status
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BGC_QUEUE_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all ${
                  activeFilter === f
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lead List */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 dark:border-white/10">
            <FilterOutlined className="mb-3 text-2xl text-slate-300 dark:text-slate-600" />
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

  // ── EVIDENCE TAB ───────────────────────────────────────────
  const EvidenceTab = (
    <div className="space-y-5">
      <SectionCard title="Smart Evidence Viewer" icon={<EyeOutlined />}>
        <SmartEvidenceViewer values={formValues} />
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

  // ── EMPTY STATE ────────────────────────────────────────────
  if (!selectedId) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
          <div>{QueuePanel}</div>

          <div className="flex min-h-[500px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white dark:border-white/10 dark:from-transparent dark:to-white/[0.02]">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                <FileSearchOutlined className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
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
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-sky-500">
                    {stats.vahanDone}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Vahan
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
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
      <div className="grid gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        {/* Left — Queue */}
        <div>{QueuePanel}</div>

        {/* Right — BGC Form */}
        <div className="rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0e1014]">
          {/* Header */}
          <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5 dark:border-white/10 dark:from-white/5 dark:to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Background Check
                  </p>
                  <BGCProgressSteps currentStatus={selectedLead?.bgcStatus} />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
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
                    key: "evidence",
                    label: (
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <PaperClipOutlined />
                        Evidence
                      </span>
                    ),
                    children: EvidenceTab,
                  },
                  {
                    key: "audit",
                    label: (
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                        <HistoryOutlined />
                        Audit Trail
                        {(selectedLead?.auditTrail || []).length > 0 && (
                          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
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
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl dark:border-white/10 dark:bg-[#090b0e]/95">
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
                          className="!flex !items-center !gap-2 !rounded-xl !border-sky-300 !bg-sky-50 !px-4 !py-2 !font-semibold !text-sky-700 hover:!bg-sky-100 dark:!border-sky-500/40 dark:!bg-sky-500/10 dark:!text-sky-400"
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
