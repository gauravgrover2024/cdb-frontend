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
  EditOutlined,
  HistoryOutlined,
  PaperClipOutlined,
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
import "./theme.css";

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
    [BGC_STATUS.PENDING]: "badge-pending",
    [BGC_STATUS.VAHAN_DONE]: "badge-vahan",
    [BGC_STATUS.COMPLETE]: "badge-complete",
    APPROVED: "badge-approved",
    REJECTED: "badge-rejected",
    ESCALATED: "badge-escalated",
  };
  const badgeClass = configs[status] || configs[BGC_STATUS.PENDING];
  const sizeClass = size === "small" ? "is-small" : "";

  return (
    <span className={`uc-bgc-status-badge ${badgeClass} ${sizeClass}`}>
      <span className="uc-bgc-status-dot" />
      {status?.replace(/_/g, " ")}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSPECTION SCORE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function InspectionScore({ score }) {
  const getScoreConfig = (score) => {
    if (score >= 80) return { color: "#437a22", label: "Excellent" };
    if (score >= 60) return { color: "#da7101", label: "Good" };
    return { color: "#c0392b", label: "Poor" };
  };

  const config = getScoreConfig(score);

  return (
    <Tooltip title={`${config.label} Condition (${score}%)`}>
      <div className="uc-bgc-score-pill" style={{ borderColor: `${config.color}55`, color: config.color }}>
        <TrophyOutlined style={{ color: config.color, fontSize: 12 }} />
        <span className="text-[10px] font-black">{score}%</span>
      </div>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARD RULE ALERT
// ═══════════════════════════════════════════════════════════════════════════════
function HardRuleAlert({ rule }) {
  if (!rule) return null;

  const isAutoReject = rule.type === "auto-reject";

  return (
    <div className={`uc-bgc-rule-banner ${isAutoReject ? "danger" : "warn"}`}>
      <div className="uc-bgc-rule-icon">
          {rule.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="uc-bgc-rule-title">
          {isAutoReject ? "Hard Rule Triggered — Auto Reject" : "Manual Approval Required"}
        </p>
        <p className="uc-bgc-rule-text">{rule.reason}</p>
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

  return (
    <div className="uc-bgc-section-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="uc-bgc-section-header"
      >
        <div className="uc-bgc-section-title-wrap">
          {icon && (
            <div className="uc-bgc-section-icon">
              <span>{icon}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="uc-bgc-section-title">{title}</h3>
            {badge && (
              <span className={`uc-bgc-section-badge badge-${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="uc-bgc-section-right">
          <span className="uc-bgc-section-toggle-text">{open ? "Hide" : "Show"}</span>
          <span className={`uc-bgc-section-toggle-icon ${open ? "open" : ""}`}>
            <DownOutlined className="text-[10px]" />
          </span>
        </div>
      </button>

      <div className={`${open ? "block" : "hidden"}`}>
        <div className="uc-bgc-section-body">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAHAN SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function SnapshotValue({ label, value, tone = "neutral" }) {
  return (
    <div className="uc-bgc-sheet-cell">
      <p className="uc-bgc-sheet-label">{label}</p>
      <p className={`uc-bgc-sheet-value tone-${tone}`}>
        <span className={`uc-bgc-sheet-dot tone-${tone}`} />
        {value || "—"}
      </p>
    </div>
  );
}

function VahanSnapshot({ values, lead }) {
  const centralChallan = Number(values.echallanAmount || 0);
  const stateChallan = Number(values.dtpAmount || 0);
  const totalChallan = centralChallan + stateChallan;
  const makeModel = [values.make, values.model].filter(Boolean).join(" ");
  const challanLabel = `${values.challanPending === "Yes" ? "Yes" : "No"} (₹${totalChallan.toLocaleString("en-IN")})`;
  const rcExpiry = values.rcExpiry
    ? dayjs(values.rcExpiry).format("DD MMM YYYY")
    : "—";

  return (
    <div className="uc-bgc-sheet">
      <div className="uc-bgc-sheet-head">
        <p className="uc-bgc-sheet-title">Vahan Snapshot</p>
      </div>

      <div className="uc-bgc-sheet-grid uc-bgc-vahan-grid">
        <SnapshotValue label="Owner Name" value={values.ownerName || lead?.name || "—"} tone="ok" />
        <SnapshotValue label="Make / Model" value={makeModel || "—"} tone="ok" />
        <SnapshotValue label="Fuel" value={values.fuelType || lead?.fuel || "—"} tone="ok" />
        <SnapshotValue label="Mfg Year" value={values.mfgYear || lead?.mfgYear || "—"} tone="ok" />
        <SnapshotValue
          label="RC Expiry"
          value={rcExpiry}
          tone={values.rcExpiry ? "ok" : "neutral"}
        />
        <SnapshotValue
          label="Hypothecation"
          value={values.hypothecation || "No"}
          tone={values.hypothecation === "Yes" ? "warn" : "ok"}
        />
        <SnapshotValue
          label="Hypothecation Bank"
          value={values.hypothecationBank || "—"}
          tone="neutral"
        />
        <SnapshotValue label="Blacklisted" value={values.blacklisted || "No"} tone={values.blacklisted === "Yes" ? "danger" : "ok"} />
        <SnapshotValue label="Theft Record" value={values.theft || "No"} tone={values.theft === "Yes" ? "danger" : "ok"} />
        <SnapshotValue label="Challan Pending" value={challanLabel} tone={values.challanPending === "Yes" ? "warn" : "ok"} />
        <SnapshotValue
          label="RTO NOC"
          value={values.rtoNocIssued || "Not Required"}
          tone={values.rtoNocIssued?.includes("Pending") ? "warn" : "ok"}
        />
        <SnapshotValue label="Party Peshi" value={values.partyPeshi || "Not Applicable"} tone={values.partyPeshi?.includes("Applicable") ? "warn" : "ok"} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
function ServiceSnapshot({ values }) {
  const lastServiceDate = values.lastServiceDate
    ? dayjs(values.lastServiceDate).format("DD-MMM-YY")
    : "—";
  const lastServiceKm = values.lastServiceOdometer
    ? `${Number(values.lastServiceOdometer).toLocaleString("en-IN")} km`
    : "—";
  const currentOdo = values.currentOdometer
    ? `${Number(values.currentOdometer).toLocaleString("en-IN")} km`
    : "—";

  return (
    <div className="uc-bgc-sheet">
      <div className="uc-bgc-sheet-head">
        <p className="uc-bgc-sheet-title">Service Fact Sheet</p>
      </div>

      <div className="uc-bgc-sheet-grid uc-bgc-vahan-grid">
        <SnapshotValue
          label="Service History"
          value={values.serviceHistoryAvailable || "Pending"}
          tone={values.serviceHistoryAvailable === "Yes" ? "ok" : "warn"}
        />
        <SnapshotValue label="Last Service Date" value={lastServiceDate} tone={values.lastServiceDate ? "ok" : "neutral"} />
        <SnapshotValue label="Last Service KM" value={lastServiceKm} tone={values.lastServiceOdometer ? "ok" : "neutral"} />
        <SnapshotValue label="Current Odometer" value={currentOdo} tone={values.currentOdometer ? "ok" : "neutral"} />
        <SnapshotValue
          label="Odometer Status"
          value={values.odometerStatus || "Pending"}
          tone={
            values.odometerStatus &&
            values.odometerStatus !== "Not Tampered"
              ? "danger"
              : "ok"
          }
        />
        <SnapshotValue
          label="Accident History"
          value={values.accidentHistory || "Pending"}
          tone={
            values.accidentHistory && values.accidentHistory !== "None"
              ? "warn"
              : "ok"
          }
        />
        <SnapshotValue
          label="Flooded Car"
          value={values.floodedCar || "Pending"}
          tone={values.floodedCar === "Yes" ? "danger" : "ok"}
        />
        <SnapshotValue
          label="Total Loss Vehicle"
          value={values.totalLossVehicle || "Pending"}
          tone={values.totalLossVehicle === "Yes" ? "danger" : "ok"}
        />
        <SnapshotValue
          label="Migrated Vehicle"
          value={values.migratedVehicle || "Pending"}
          tone={values.migratedVehicle === "Yes" ? "warn" : "ok"}
        />
        <SnapshotValue
          label="Service Evidence"
          value={`${values.serviceFiles?.length || 0} file(s)`}
          tone="neutral"
        />
        <SnapshotValue
          label="Service Remarks"
          value={values.serviceComments || "No remarks"}
          tone="neutral"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART EVIDENCE VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
function SmartEvidenceViewer({ values }) {
  const [preview, setPreview] = useState(null);

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

  if (allFiles.length === 0) {
    return (
      <div className="uc-bgc-evidence-empty">
        <FileSearchOutlined className="text-2xl text-slate-300" />
        <p className="mt-2 text-xs text-slate-500">No evidence files attached</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        Smart Evidence Viewer
      </div>
      <div className="uc-bgc-evidence-grid">
        {allFiles.map((file, idx) => {
          const url = file.url || file.preview;
          const isPdf = file.name?.toLowerCase?.().endsWith(".pdf") || file.type === "application/pdf";
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
                })
              }
              className="uc-bgc-ev-thumb"
            >
              {url && !isPdf ? (
                <img src={url} alt={file.name || file.tag} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-500">
                  PDF
                </div>
              )}
              <span className="uc-bgc-ev-label">{file.tag}</span>
            </button>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      <Modal
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        title={<span className="text-sm font-semibold text-slate-800">{preview?.name || "Evidence"}</span>}
        width={760}
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
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
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
    <div className="uc-bgc-action-bar">
      <Tooltip title={disabled ? "Cannot approve auto-rejected vehicles" : ""}>
        <span>
          <Button
            onClick={onApprove}
            loading={saving}
            disabled={disabled}
            className="uc-bgc-btn uc-bgc-btn-approve"
            icon={<CheckOutlined />}
          >
            Approve
          </Button>
        </span>
      </Tooltip>

      <Button
        onClick={onReject}
        loading={saving}
        className="uc-bgc-btn uc-bgc-btn-reject"
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
            className="uc-bgc-btn uc-bgc-btn-escalate"
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
const QueueCard = React.memo(function QueueCard({ lead, active, onSelect }) {
  const rule = getHardRule(lead.bgcData || {});
  const cardRuleClass =
    rule?.type === "auto-reject"
      ? "is-auto-reject"
      : rule?.type === "manual"
        ? "is-manual"
        : "";
  const ruleLabel =
    rule?.type === "auto-reject"
      ? "Auto-Reject"
      : rule?.type === "manual"
        ? "Manual"
        : "Clear";
  const ruleClass =
    rule?.type === "auto-reject"
      ? "flag-reject"
      : rule?.type === "manual"
        ? "flag-manual"
        : "flag-clear";

  return (
    <button
      type="button"
      onClick={() => onSelect(lead.id)}
      className={`uc-bgc-q-card ${active ? "is-active" : ""} ${cardRuleClass}`}
    >
      <div className="uc-bgc-q-top">
        <div className="min-w-0">
          <h4 className="uc-bgc-q-title truncate">
              {lead.make} {lead.model}
          </h4>
          <p className="uc-bgc-q-sub">
            {lead.variant} · {lead.mfgYear}
          </p>
          <p className="uc-bgc-q-reg">{lead.regNo}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <InspectionScore score={lead.inspectionScore} />
          {rule?.type === "auto-reject" ? (
            <StopFilled className="text-[12px] text-red-500" />
          ) : null}
        </div>
      </div>

      <div className="uc-bgc-q-bottom">
        <p className="uc-bgc-q-agent">{lead.assignedTo}</p>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={lead.bgcStatus} size="small" />
          <span className={`uc-bgc-rule-flag ${ruleClass}`}>{ruleLabel}</span>
        </div>
      </div>

      <div className="mt-1">
        <p className="uc-bgc-q-regline">
          {lead.name}
          <span className="mx-1 text-slate-300">·</span>
          <span className="font-semibold text-slate-500">
            {lead.regNo}
          </span>
        </p>
      </div>
    </button>
  );
});

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
      iconBg: "var(--warn-hl)",
      iconColor: "var(--warn)",
      amountColor: "var(--warn)",
    },
    rose: {
      iconBg: "var(--danger-hl)",
      iconColor: "var(--danger)",
      amountColor: "var(--danger)",
    },
  };
  const c = colors[colorScheme] || colors.amber;

  return (
    <div className="uc-bgc-challan-card">
      <div className="uc-bgc-challan-header">
        <div className="flex items-center gap-3">
          <div className="uc-bgc-challan-icon" style={{ background: c.iconBg, color: c.iconColor }}>
            {icon}
          </div>
          <div>
            <p className="uc-bgc-challan-label">
              {title}
            </p>
            <p className="text-xs font-bold text-slate-700">{count} Pending</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Total Liability</p>
          <p className="uc-bgc-challan-amount" style={{ color: c.amountColor }}>
            ₹{Number(amount).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="uc-bgc-form-grid cols-2">
        <div className="uc-bgc-form-group">
          <label className="uc-bgc-form-label">
            Count
          </label>
          <Form.Item name={countName} className="!mb-0">
            <InputNumber
              min={0}
              className="!w-full"
              placeholder="Qty"
            />
          </Form.Item>
        </div>
        <div className="uc-bgc-form-group">
          <label className="uc-bgc-form-label">
            Amount (₹)
          </label>
          <Form.Item name={amountName} className="!mb-0">
            <InputNumber
              min={0}
              className="!w-full"
              placeholder="Amount"
              formatter={(v) =>
                v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
            />
          </Form.Item>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-200/70 pt-3">
        <p className="uc-bgc-form-label mb-2">
          Evidence
        </p>
        <Form.Item
          name={filesName}
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          className="!mb-0"
        >
          <EvidenceUpload maxCount={5} />
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

  const handleSelectLead = useCallback((leadId) => {
    setSelectedId(leadId);
    setActiveTab("vahan");
  }, []);

  const handleValuesChange = useCallback(
    (_, all) => {
      setFormValues(all);
      if (!selectedId) return;
      const liveRule = getHardRule(all);

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

  const tabNavItems = useMemo(
    () => [
      { key: "vahan", label: "Vahan Check", icon: <CarOutlined /> },
      { key: "service", label: "Service History", icon: <HistoryOutlined /> },
      {
        key: "audit",
        label: "Audit Trail",
        icon: <HistoryOutlined />,
        badge: (selectedLead?.auditTrail || []).length || 0,
      },
    ],
    [selectedLead?.auditTrail],
  );

  // ── QUEUE PANEL ────────────────────────────────────────────
  const QueuePanel = useMemo(() => (
    <div className="uc-bgc-sidebar-shell">
      <div className="uc-bgc-sidebar-header">
        <div className="uc-bgc-sidebar-title">BGC Queue</div>
        <div className="uc-bgc-sidebar-count">{stats.total} Cars</div>
      </div>
      <div className="uc-bgc-sidebar-inner">
        <div className="relative">
          <SearchOutlined className="uc-bgc-search-icon" />
          <input
            type="text"
            placeholder="Name, reg, make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="uc-bgc-search-input"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="uc-bgc-search-clear"
              type="button"
            >
              <ClearOutlined />
            </button>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            Filter by status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {queueFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`uc-bgc-filter-chip ${activeFilter === filter.key ? "active" : ""}`}
              >
                <span>{filter.label}</span>
                <span className={`uc-bgc-filter-chip-count ${activeFilter === filter.key ? "active" : ""}`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="uc-bgc-queue-list">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12">
            <FilterOutlined className="mb-3 text-2xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">
              No matches found
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveFilter("All");
              }}
              className="mt-2 text-xs text-[#01696f] hover:underline"
              type="button"
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
              onSelect={handleSelectLead}
            />
          ))
        )}
      </div>
    </div>
  ), [
    activeFilter,
    filteredLeads,
    handleSelectLead,
    queueFilters,
    search,
    selectedId,
    stats.total,
  ]);
  // ── VAHAN TAB ──────────────────────────────────────────────
  const VahanTab = (
    <div className="space-y-5">
      <SectionCard title="Vahan Check Snapshot" icon={<FileSearchOutlined />}>
        <VahanSnapshot values={formValues} lead={selectedLead} />
      </SectionCard>

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
      <SectionCard title="Service Fact Sheet" icon={<HistoryOutlined />}>
        <ServiceSnapshot values={formValues} />
      </SectionCard>

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
      <section className="uc-bgc-theme space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
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
      <section className="uc-bgc-theme">
        <div className="uc-bgc-layout">
          <div>{QueuePanel}</div>

          <div className="uc-bgc-main-shell flex min-h-[500px] items-center justify-center">
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
    <section className="uc-bgc-theme">
      <div className="uc-bgc-layout">
        {/* Left — Queue */}
        <div>{QueuePanel}</div>

        {/* Right — BGC Form */}
        <div className="uc-bgc-main-shell">
          {/* Header */}
          <div className="uc-bgc-car-header">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Background Check
                  </p>
                </div>
                <h2 className="text-[22px] font-black tracking-tight text-slate-900">
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

              <div className="uc-bgc-tabbar" role="tablist" aria-label="Background check tabs">
                {tabNavItems.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={`uc-bgc-tabbtn ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span className="uc-bgc-tabbtn-icon">{tab.icon}</span>
                    <span className="uc-bgc-tabbtn-label">{tab.label}</span>
                    {tab.badge > 0 ? (
                      <span className="uc-bgc-tabbtn-badge">{tab.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {activeTab === "vahan" ? VahanTab : null}
                {activeTab === "service" ? ServiceTab : null}
                {activeTab === "audit" ? AuditTab : null}
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-4 z-50 mt-6">
                <div className="uc-bgc-sticky-footer">
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
                      className="uc-bgc-btn uc-bgc-btn-ghost"
                    >
                      Save Draft
                    </Button>

                    {activeTab === "vahan" &&
                      selectedLead?.bgcStatus === BGC_STATUS.PENDING && (
                        <Button
                          onClick={handleMarkVahanDone}
                          loading={saving}
                          icon={<RightOutlined />}
                          className="uc-bgc-btn uc-bgc-btn-primary"
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
                        className="uc-bgc-btn uc-bgc-btn-primary"
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
