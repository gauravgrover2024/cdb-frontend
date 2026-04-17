import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Collapse,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Tabs,
  TimePicker,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  UserOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { INSPECTION_QUEUE_STAGE } from "./UsedCarLeadManager/constants";
import { dayjs, fmt, fmtInr } from "./UsedCarLeadManager/utils/formatters";
import {
  getInsuranceDisplay,
  getMileage,
  getPrice,
  mkActivity,
  normalizeLeadRecord,
  normText,
} from "./UsedCarLeadManager/utils/leadUtils";
import { usedCarsApi } from "../../../api/usedCars";
import { uploadMultipleFiles } from "../../../api/uploads";

import {
  INSPECTION_DONE_STAGE,
  NOGO_REASON,
  REPORT_VERSION,
  QUEUE_FILTERS,
  TYRE_ITEM_KEYS,
  PHOTO_BUCKETS,
  LEAD_VERIFICATION_FIELDS,
  SEVERITY_OPTIONS,
  TYRE_BRANDS,
  NOGO_REASONS,
  INSPECTION_SECTIONS,
  tyreLifeFromTread,
  calcSectionScore,
  calcOverallScore,
  toFileList,
  fromFileList,
  normalizeEvidenceFiles,
  isPositiveInspectionStatus,
  normalizeStatusList,
  getItemOptions,
  allowsMultiSelect,
  isPhotoEligibleItem,
  getStatusSeverity,
  getItemOptionMeta,
  getOptionActiveTone,
  getOptionTone,
} from "./InspectionDesk/constants";
import {
  buildNoGoNarrative,
  buildRefurbContext,
} from "./InspectionDesk/refurb";

const { TextArea } = Input;
const { Panel } = Collapse;

function getTaggedEvidenceFile(files = [], aliases = []) {
  const aliasSet = new Set(
    aliases.map((entry) =>
      String(entry || "")
        .trim()
        .toLowerCase(),
    ),
  );
  return files.find((file) =>
    aliasSet.has(
      String(file.evidenceTag || "")
        .trim()
        .toLowerCase(),
    ),
  );
}

function getEvidenceTagLabel(file = {}) {
  if (String(file.evidenceTag || "").toLowerCase() === "others") {
    return file.customTagName || "Others";
  }
  return file.evidenceTag || "";
}

function buildPhotoBucketsFromEvidence(files = []) {
  const normalized = normalizeEvidenceFiles(files);
  return Object.fromEntries(
    PHOTO_BUCKETS.map((bucket) => [
      bucket.key,
      normalized.filter((file) => {
        const tag = String(getEvidenceTagLabel(file) || "")
          .trim()
          .toLowerCase();
        return (
          tag === String(bucket.labelEn).toLowerCase() ||
          tag === String(bucket.key).toLowerCase()
        );
      }),
    ]),
  );
}

function buildEvidenceTags(files = [], evidenceTargets = []) {
  return Array.from(
    new Set(
      [
        ...PHOTO_BUCKETS.map((bucket) => bucket.labelEn),
        ...evidenceTargets.map((item) => item.label).filter(Boolean),
        ...normalizeEvidenceFiles(files)
          .map((file) => getEvidenceTagLabel(file))
          .filter(Boolean),
      ].filter(Boolean),
    ),
  );
}

function uniqStrings(values = []) {
  return Array.from(
    new Set(values.map((entry) => normText(entry)).filter(Boolean)),
  );
}

function stripNoGoNarrative(text = "") {
  return normText(
    String(text || "").replace(/No-Go reasons:[^.]*(?:\.)?/gi, " "),
  );
}

function chunkItems(items = [], size = 4) {
  const out = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function FormValueSink() {
  return null;
}

function scrollInspectionItemIntoView(itemKey, retries = 0) {
  const node = document.querySelector(`[data-inspection-item="${itemKey}"]`);
  if (!node) {
    if (retries < 8) {
      window.setTimeout(
        () => scrollInspectionItemIntoView(itemKey, retries + 1),
        40,
      );
    }
    return;
  }
  node.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
  const root =
    document.scrollingElement || document.documentElement || document.body;
  if (root && typeof root.scrollTop === "number") {
    root.scrollTop = Math.max(0, root.scrollTop - 118);
  }
}

// ── Inspection state badge ───────────────────────────────────────
const getInspectionState = (lead) => {
  const inspection = lead?.inspection;

  if (lead?.status === "Closed") {
    return {
      key: "closed",
      label: "Closed",
      tone: "bg-slate-100 text-slate-500 border-slate-200",
    };
  }
  if (inspection?.submittedAt) {
    const isNogo = inspection?.verdict === NOGO_REASON;
    return {
      key: "completed",
      label: isNogo ? "No-Go" : "Completed",
      tone: isNogo
        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40"
        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
    };
  }
  if (inspection?.lastOutcome === "rescheduled") {
    return {
      key: "rescheduled",
      label: "Rescheduled",
      tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
    };
  }
  if (inspection?.startedAt) {
    return {
      key: "draft",
      label: "Draft",
      tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40",
    };
  }
  return {
    key: "scheduled",
    label: "Scheduled",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40",
  };
};

// ── Build form initial values from saved lead.inspection ─────────
const buildReportValues = (lead) => {
  const inspection = lead?.inspection || {};
  const report = inspection?.report || {};
  const leadVerif = report?.leadVerification || {};
  const photoBuckets = report?.photoBuckets || {};
  const bulkEvidence = report?.bulkEvidence || [];
  const savedItems = report?.items || {};

  const baseDate =
    inspection?.submittedAt ||
    inspection?.startedAt ||
    lead?.inspectionScheduledAt ||
    new Date().toISOString();

  // Rebuild checklist item values for form
  const items = {};
  INSPECTION_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const saved = savedItems[item.key] || {};
      items[item.key] = {
        status: Array.isArray(saved.status)
          ? saved.status
          : saved.status
            ? [saved.status]
            : [],
        severity: saved.severity || "",
        photos: toFileList(saved.photos || [], item.key),
        // tyre-specific
        ...(item.hasTread ? { treadDepth: saved.treadDepth || "" } : {}),
        ...(item.hasBrand ? { tyreBrand: saved.tyreBrand || "" } : {}),
      };
    });
  });

  return {
    // Visit details
    inspectionId: inspection?.inspectionId || "",
    customerName: report?.customerName || lead?.name || "",
    executiveName: inspection?.executiveName || lead?.assignedTo || "",
    executiveMobile: inspection?.executiveMobile || "",
    inspectionLocation: report?.inspectionLocation || lead?.address || "",
    registrationNumber: report?.registrationNumber || lead?.regNo || "",
    insuranceType:
      report?.insuranceType || lead?.insuranceCategory || lead?.insurance || "",
    insuranceExpiry: report?.insuranceExpiry
      ? dayjs(report.insuranceExpiry)
      : null,
    makeConfirmation: report?.makeConfirmation || lead?.make || undefined,
    modelConfirmation: report?.modelConfirmation || lead?.model || undefined,
    variantConfirmation:
      report?.variantConfirmation || lead?.variant || undefined,
    inspectionDate: dayjs(baseDate),
    inspectionTime: dayjs(baseDate),

    // Lead verification
    leadVerification: Object.fromEntries(
      LEAD_VERIFICATION_FIELDS.map((f) => [
        f.key,
        leadVerif[f.key] || undefined,
      ]),
    ),

    // Photo buckets
    photoBuckets: Object.fromEntries(
      PHOTO_BUCKETS.map((b) => [
        b.key,
        toFileList(photoBuckets[b.key] || [], b.key),
      ]),
    ),
    bulkEvidence: toFileList(bulkEvidence, "bulk-evidence"),

    // All checklist items
    items,

    // OEM feature counts
    airbagCount: report?.airbagCount || undefined,
    powerWindowCount: report?.powerWindowCount || undefined,
    seatMaterial: report?.seatMaterial || undefined,

    // Final decision
    verdict: inspection?.verdict || undefined,
    noGoReason: inspection?.noGoReason || "",
    estimatedRefurbCost: report?.estimatedRefurbCost ?? null,
    evaluatorPrice: report?.evaluatorPrice || getPrice(lead) || null,
    suggestedBuyPrice: report?.suggestedBuyPrice ?? null,
    negotiationNotes: report?.negotiationNotes || "",
    overallRemarks: inspection?.remarks || report?.overallRemarks || "",
  };
};

// ── Build report payload from form values (for saving) ───────────
const buildReportPayload = (values, reportLead, liveState = {}) => {
  const resolvedItems =
    values.items ||
    liveState.items ||
    reportLead?.inspection?.report?.items ||
    {};
  const resolvedLeadVerification =
    values.leadVerification ||
    liveState.leadVerification ||
    reportLead?.inspection?.report?.leadVerification ||
    {};
  const resolvedBulkEvidence =
    values.bulkEvidence ||
    liveState.bulkEvidence ||
    reportLead?.inspection?.report?.bulkEvidence ||
    [];
  const bulkEvidence = fromFileList(resolvedBulkEvidence);
  const evidenceTargets = getEvidenceTargets(resolvedItems);
  const refurb = buildRefurbContext({
    lead: reportLead,
    values: {
      ...values,
      items: resolvedItems,
      bulkEvidence: resolvedBulkEvidence,
    },
  });
  const explicitNoGo = values.verdict === NOGO_REASON;
  const shouldTreatNoGo = explicitNoGo || (!values.verdict && refurb.noGo);
  const noGoReasons = shouldTreatNoGo ? uniqStrings(refurb.noGoReasons || []) : [];
  const noGoNarrative = shouldTreatNoGo
    ? buildNoGoNarrative({
        ...refurb,
        noGoReasons,
      })
    : "";
  const cleanedOverall = stripNoGoNarrative(values.overallRemarks);
  const overallRemarks = [cleanedOverall, noGoNarrative]
    .filter(Boolean)
    .join(" ");

  return {
    customerName: normText(values.customerName),
    inspectionLocation: normText(values.inspectionLocation),
    registrationNumber: normText(values.registrationNumber),
    insuranceType: normText(values.insuranceType),
    insuranceExpiry: values.insuranceExpiry
      ? dayjs(values.insuranceExpiry).toISOString()
      : "",
    makeConfirmation: normText(values.makeConfirmation),
    modelConfirmation: normText(values.modelConfirmation),
    variantConfirmation: normText(values.variantConfirmation),
    leadVerification: Object.fromEntries(
      LEAD_VERIFICATION_FIELDS.map((f) => [
        f.key,
        resolvedLeadVerification?.[f.key],
      ]),
    ),
    photoBuckets: buildPhotoBucketsFromEvidence(bulkEvidence),
    bulkEvidence,
    evidenceTags: buildEvidenceTags(bulkEvidence, evidenceTargets),
    items: Object.fromEntries(
      INSPECTION_SECTIONS.flatMap((s) =>
        s.items.map((item) => [
          item.key,
          {
            status: normalizeStatusList(resolvedItems?.[item.key]?.status),
            severity: resolvedItems?.[item.key]?.severity || "",
            photos: fromFileList(resolvedItems?.[item.key]?.photos || []),
            ...(item.hasTread
              ? {
                  treadDepth:
                    resolvedItems?.[item.key]?.treadDepth === ""
                      ? null
                      : Number(resolvedItems?.[item.key]?.treadDepth) || null,
                }
              : {}),
            ...(item.hasBrand
              ? { tyreBrand: resolvedItems?.[item.key]?.tyreBrand || "" }
              : {}),
          },
        ]),
      ),
    ),
    airbagCount: values.airbagCount || "",
    powerWindowCount: values.powerWindowCount || "",
    seatMaterial: values.seatMaterial || "",
    estimatedRefurbCost: shouldTreatNoGo
      ? 0
      : Number(values.estimatedRefurbCost ?? refurb.totalCost) || 0,
    evaluatorPrice: Number(values.evaluatorPrice) || null,
    suggestedBuyPrice: shouldTreatNoGo
      ? 0
      : refurb.suggestedBuyPrice || 0,
    negotiationNotes: normText(values.negotiationNotes),
    overallRemarks,
    noGoReasons,
    refurb: {
      ...refurb,
      noGo: shouldTreatNoGo,
      noGoReasons,
      totalCost: shouldTreatNoGo ? 0 : Number(refurb.totalCost || 0),
      suggestedBuyPrice: shouldTreatNoGo
        ? 0
        : Number(refurb.suggestedBuyPrice || 0),
    },
    reportVersion: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
  };
};

// ── END PART 2J — END OF ALL PART 2 SUB-PARTS ───────────────────

function fmtInrOrPending(value) {
  return Number(value || 0) > 0 ? fmtInr(value) : "Price pending";
}

function QueueMetric({ label, value, helper, tone = "slate" }) {
  const toneMap = {
    slate: "text-foreground dark:text-card-foreground",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
    rose: "text-rose-700 dark:text-rose-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <div className="rounded-[22px] border border-border bg-muted/50 px-4 py-3 dark:border-border dark:bg-muted/20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black tracking-tight ${toneMap[tone] || toneMap.slate}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ScoreBadge({ score }) {
  const color =
    score >= 75
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
      : score >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${color}`}
    >
      Score {score}%
    </span>
  );
}

function TyreLifeBar({ treadMm }) {
  const life = tyreLifeFromTread(treadMm);
  return (
    <div className="mt-2 rounded-[12px] border border-border bg-card px-3 py-2 dark:border-border dark:bg-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground">
          Tyre Life — {life.pct}%
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground dark:text-muted-foreground">
          ~{life.km} km remaining
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted dark:bg-muted">
        <div
          style={{ width: `${life.pct}%`, background: life.color }}
          className="h-full rounded-full transition-all duration-500"
        />
      </div>
    </div>
  );
}

function OverallScoreRing({ score }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <Progress type="circle" percent={score} size={72} strokeColor={color} />
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Inspection completeness
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Checklist completion across all major sections
        </p>
      </div>
    </div>
  );
}

function getSectionOrder(sectionKey) {
  const index = INSPECTION_SECTIONS.findIndex(
    (section) => section.key === sectionKey,
  );
  return index >= 0 ? String(index + 1).padStart(2, "0") : "--";
}

function InspectionQueueCard({ lead, active, onClick }) {
  const state = getInspectionState(lead);
  const schedule =
    lead?.inspection?.rescheduledAt || lead?.inspectionScheduledAt;
  const isToday = schedule && dayjs(schedule).isSame(dayjs(), "day");
  const isOverdue =
    schedule && dayjs(schedule).isBefore(dayjs()) && state.key === "scheduled";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-700 dark:bg-black dark:text-white"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">
            {lead.name}
          </p>
          <p
            className={`mt-1 text-xs font-medium ${active ? "text-primary-foreground/70 dark:text-foreground/70" : "text-muted-foreground dark:text-muted-foreground"}`}
          >
            {lead.mobile} · {lead.make} {lead.model}
            {lead.variant ? ` ${lead.variant}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${state.tone}`}
          >
            {state.label}
          </span>
          {isOverdue ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              OVERDUE
            </span>
          ) : null}
          {isToday && !isOverdue ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              TODAY
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div
          className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-white/[0.06]" : "bg-slate-50 dark:bg-white/[0.04]"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}
          >
            Executive
          </p>
          <p className="mt-1 truncate text-xs font-bold">
            {lead.inspection?.executiveName ||
              lead.assignedTo ||
              "Not assigned"}
          </p>
          <p
            className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}
          >
            {lead.inspection?.executiveMobile || "Mobile pending"}
          </p>
        </div>
        <div
          className={`rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-white/[0.06]" : "bg-slate-50 dark:bg-white/[0.04]"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}
          >
            Slot
          </p>
          <p className="mt-1 text-xs font-bold">
            {schedule ? fmt(schedule) : "Not scheduled"}
          </p>
          <p
            className={`mt-0.5 text-[10px] font-medium ${active ? "text-white/60 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}
          >
            {lead.regNo || "Reg pending"} · {getMileage(lead) || "Kms pending"}
          </p>
        </div>
      </div>
      <div
        className={`mt-2 flex items-center justify-between text-xs font-medium ${active ? "text-white/72 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}
      >
        <span>{getInsuranceDisplay(lead) || "Insurance pending"}</span>
        <span
          className={`font-bold ${active ? "text-white dark:text-white" : "text-slate-800 dark:text-slate-200"}`}
        >
          {fmtInrOrPending(getPrice(lead))}
        </span>
      </div>
      {state.key === "draft" ? (
        <div
          className={`mt-3 rounded-[14px] px-3 py-2 ${active ? "bg-white/10 dark:bg-white/[0.06]" : "bg-slate-50 dark:bg-white/[0.04]"}`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${active ? "text-white/55" : "text-slate-400 dark:text-slate-500"}`}
          >
            Draft Report
          </p>
          <p className="mt-1 text-xs font-bold">
            Inspection started, submission pending
          </p>
        </div>
      ) : null}
    </button>
  );
}

function VerificationCard({ field, checked, onToggle }) {
  const [localChecked, setLocalChecked] = useState(Boolean(checked));

  useEffect(() => {
    setLocalChecked(Boolean(checked));
  }, [checked]);

  const activeStyle = localChecked
    ? {
        borderColor: "#047857",
        background: "#047857",
        color: "#ffffff",
        boxShadow: "0 12px 28px rgba(5, 150, 105, 0.30)",
      }
    : undefined;
  return (
    <button
      type="button"
      onClick={() => {
        const next = !localChecked;
        setLocalChecked(next);
        onToggle(next);
      }}
      style={activeStyle}
      className={`w-full rounded-[18px] border px-4 py-3 text-left transition-all ${
        localChecked
          ? ""
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11151b]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black ${
              localChecked
                ? "border-white bg-white text-emerald-700"
                : "border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500"
            }`}
          >
            {localChecked ? "✓" : ""}
          </span>
          <div>
            <p
              className={`text-sm font-semibold ${
                localChecked
                  ? "text-white"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {field.labelEn}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            localChecked
              ? "border-white/70 bg-white text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
          }`}
        >
          {localChecked ? "Verified" : "Pending"}
        </span>
      </div>
    </button>
  );
}

function SectionItemCard({
  item,
  section,
  formName,
  itemValue,
  autoOpen,
  clearAutoOpen,
  onAdvance,
  onSeedTyreBrand,
  onValueChange,
}) {
  const itemRef = useRef(null);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const options = getItemOptions(item, section);
  const multiSelect = allowsMultiSelect(item, section);
  const photoEligible = isPhotoEligibleItem(item, section);
  const isTyre = Boolean(item.hasTread);
  const hasBrand = Boolean(item.hasBrand);
  const form = Form.useFormInstance();
  const currentItemValue = itemValue || {};
  const statusVal = normalizeStatusList(currentItemValue.status);
  const severityVal = currentItemValue.severity;
  const treadVal = currentItemValue.treadDepth;
  const answered = statusVal.length > 0;
  const isCollapsed = answered && !autoOpen && !manuallyExpanded;

  useEffect(() => {
    if (autoOpen) {
      setManuallyExpanded(false);
    }
  }, [autoOpen]);

  useEffect(() => {
    if (!autoOpen) return;
    const timeout = window.setTimeout(() => clearAutoOpen(), 120);
    return () => window.clearTimeout(timeout);
  }, [autoOpen, clearAutoOpen]);

  const handleStatusSelect = useCallback(
    (status) => {
      const currentValue = form.getFieldValue([formName, item.key]) || {};
      const currentStatuses = normalizeStatusList(currentValue.status);
      const nextStatuses = multiSelect
        ? currentStatuses.includes(status)
          ? currentStatuses.filter((entry) => entry !== status)
          : [...currentStatuses, status]
        : currentStatuses[0] === status
          ? []
          : [status];
      form.setFieldsValue({
        [formName]: {
          ...(form.getFieldValue(formName) || {}),
          [item.key]: {
            ...currentValue,
            status: nextStatuses,
            severity: nextStatuses.length
              ? currentValue.severity ||
                getStatusSeverity(nextStatuses, item, section)
              : "",
          },
        },
      });
      onValueChange?.();
      const shouldAdvance =
        currentStatuses.length === 0 && nextStatuses.length > 0;
      if (!shouldAdvance) return;
      onAdvance(item.key);
    },
    [form, formName, item, multiSelect, onAdvance, onValueChange, section],
  );

  const showEvidenceUploader =
    photoEligible &&
    statusVal.length > 0 &&
    !isPositiveInspectionStatus(statusVal);

  if (isCollapsed) {
    return (
      <button
        type="button"
        ref={itemRef}
        data-inspection-item={item.key}
        onClick={() => setManuallyExpanded(true)}
        style={{ scrollMarginTop: "140px" }}
        className="w-full rounded-[18px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left transition-all hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {item.labelEn}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white dark:border-emerald-400/40">
                Answered
              </span>
              {statusVal.map((status) => {
                const meta = getItemOptionMeta(item, section, status) || {
                  value: status,
                };
                return (
                  <span
                    key={status}
                    style={getOptionActiveTone(meta)}
                    className="rounded-full border-2 px-2.5 py-1 text-[11px] font-bold"
                  >
                    {status}
                  </span>
                );
              })}
            </div>
          </div>
          <span className="rounded-full border border-slate-300 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:text-slate-300">
            Review
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      ref={itemRef}
      data-inspection-item={item.key}
      style={{ scrollMarginTop: "120px" }}
      className={`rounded-[18px] border px-4 py-4 transition-all ${
        autoOpen
          ? "border-sky-400 bg-sky-50/70 shadow-[0_0_0_3px_rgba(14,165,233,0.10)] dark:border-sky-400/70 dark:bg-sky-500/10"
          : "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.labelEn}
          </p>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-2">
          {answered ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white dark:border-emerald-400/40">
              Answered
            </span>
          ) : null}
          {showEvidenceUploader ? (
            <span className="rounded-full border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
              Evidence needed
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Condition
        </p>
        {multiSelect ? (
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Multiple conditions can be selected for one part.
          </p>
        ) : null}
        {statusVal.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              Selected
            </span>
            {statusVal.map((status) => {
              const meta = getItemOptionMeta(item, section, status) || {
                value: status,
              };
              const activeTone = getOptionActiveTone(meta);
              return (
                <span
                  key={status}
                  style={activeTone}
                  className="rounded-full border-2 px-2.5 py-1 text-[11px] font-bold"
                  // border → border-2 so inline borderColor actually shows
                >
                  {status}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => {
            const active = statusVal.includes(option.value);
            const tone = getOptionTone(option);
            const activeTone = getOptionActiveTone(option);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleStatusSelect(option.value)}
                style={
                  active
                    ? activeTone
                    : {
                        borderColor: tone.borderColor,
                        color: tone.color,
                        background: "transparent",
                      }
                }
                className={`relative z-10 cursor-pointer rounded-full border-2 px-4 py-2.5 text-sm font-bold leading-none transition-all duration-100 ${
                  active
                    ? "scale-[1.02] opacity-100"
                    : "opacity-85 hover:opacity-100 hover:scale-[1.01]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {active ? <span className="text-[11px]">✓</span> : null}
                  <span>{option.value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {statusVal.length > 0 && !isPositiveInspectionStatus(statusVal) ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Severity
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  form.setFieldValue(
                    [formName, item.key, "severity"],
                    option.value,
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  severityVal === option.value
                    ? `${option.tone} shadow-sm`
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20"
                }`}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isTyre ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Form.Item
            label={
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tread Depth (mm)
              </span>
            }
            name={[formName, item.key, "treadDepth"]}
            className="!mb-0"
          >
            <InputNumber
              min={0}
              max={12}
              step={0.5}
              placeholder="e.g. 4.5"
              className="w-full"
              addonAfter="mm"
            />
          </Form.Item>
          {hasBrand ? (
            <Form.Item
              label={
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Tyre Brand
                </span>
              }
              name={[formName, item.key, "tyreBrand"]}
              className="!mb-0"
            >
              <Select
                placeholder="Brand chunein..."
                showSearch
                allowClear
                options={TYRE_BRANDS.map((v) => ({ value: v, label: v }))}
                onChange={(value) => onSeedTyreBrand(item.key, value)}
              />
            </Form.Item>
          ) : null}
        </div>
      ) : null}
      {isTyre && treadVal > 0 ? <TyreLifeBar treadMm={treadVal} /> : null}
      {showEvidenceUploader ? (
        <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          This part has been added to the Evidence Vault. Upload and tag the
          supporting photos from the evidence block above.
        </p>
      ) : null}
    </div>
  );
}

function ReportSummaryCard({ reportLead, reportItems, liveValues = {} }) {
  const score = calcOverallScore(reportItems);
  const liveRegNo = liveValues.registrationNumber || reportLead.regNo;
  const liveInsuranceType =
    liveValues.insuranceType ||
    reportLead.insuranceCategory ||
    reportLead.insurance ||
    "Pending";
  const liveVehicle = [
    liveValues.makeConfirmation || reportLead.make,
    liveValues.modelConfirmation || reportLead.model,
    liveValues.variantConfirmation || reportLead.variant,
  ]
    .filter(Boolean)
    .join(" ");
  const liveSchedule =
    liveValues.inspectionDate && liveValues.inspectionTime
      ? dayjs(liveValues.inspectionDate)
          .hour(dayjs(liveValues.inspectionTime).hour())
          .minute(dayjs(liveValues.inspectionTime).minute())
          .second(0)
      : reportLead.inspection?.rescheduledAt ||
        reportLead.inspectionScheduledAt ||
        new Date();
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <QueueMetric
        label="Inspection ID"
        value={reportLead.inspection?.inspectionId || "Not generated"}
        helper="Auto-generated for this visit"
      />
      <QueueMetric
        label="Seller Ask"
        value={fmtInrOrPending(getPrice(reportLead))}
        helper={`${getMileage(reportLead) || "Kms pending"} · ${reportLead.ownership || "Ownership pending"}`}
        tone="emerald"
      />
      <QueueMetric
        label="Insurance"
        value={liveInsuranceType}
        helper={`Reg: ${liveRegNo || "Pending"} · ${liveVehicle || "Vehicle pending"}`}
        tone="amber"
      />
      <QueueMetric
        label="Scheduled For"
        value={fmt(liveSchedule)}
        helper="Field visit slot"
        tone="violet"
      />
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Overall Score
        </p>
        <div className="mt-3">
          <OverallScoreRing score={score} />
        </div>
      </div>
    </div>
  );
}

function getStoredFileSrc(file) {
  return file?.url || file?.thumbUrl || file?.preview || "";
}

function compactStatus(status) {
  const statuses = normalizeStatusList(status).map((entry) =>
    String(entry).split("—")[0].trim(),
  );
  if (!statuses.length) return "Not marked";
  if (statuses.length === 1) return statuses[0];
  if (statuses.length === 2) return `${statuses[0]} and ${statuses[1]}`;
  return `${statuses.slice(0, -1).join(", ")} and ${statuses.at(-1)}`;
}

function getSectionCounts(section, itemValues) {
  return section.items.reduce(
    (acc, item) => {
      const status = itemValues?.[item.key]?.status;
      if (!normalizeStatusList(status).length) return acc;
      if (isPositiveInspectionStatus(status)) acc.good += 1;
      else acc.issue += 1;
      return acc;
    },
    { good: 0, issue: 0 },
  );
}

function getMediaDiscipline(
  photoBuckets = {},
  itemValues = {},
  bulkEvidence = [],
) {
  const normalizedBulkEvidence = normalizeEvidenceFiles(bulkEvidence);
  const requiredPhotos = PHOTO_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.labelEn,
    files:
      photoBuckets[bucket.key] ||
      (getTaggedEvidenceFile(normalizedBulkEvidence, [
        bucket.labelEn,
        bucket.key,
      ])
        ? [
            getTaggedEvidenceFile(normalizedBulkEvidence, [
              bucket.labelEn,
              bucket.key,
            ]),
          ]
        : []),
  }));
  const capturedRequired = requiredPhotos.filter(
    (bucket) => bucket.files.length,
  ).length;
  const defectItems = INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .map((item) => ({
        key: item.key,
        label: item.labelEn,
        status: itemValues?.[item.key]?.status,
        photos: [
          ...(itemValues?.[item.key]?.photos || []).filter(Boolean),
          ...normalizedBulkEvidence.filter((file) => {
            const tag = String(getEvidenceTagLabel(file) || "")
              .trim()
              .toLowerCase();
            return (
              tag ===
                String(item.labelEn || item.label || "")
                  .trim()
                  .toLowerCase() || tag === String(item.key || "").toLowerCase()
            );
          }),
        ],
        eligible: isPhotoEligibleItem(item, section),
      }))
      .filter(
        (item) =>
          item.eligible &&
          Boolean(item.label) &&
          normalizeStatusList(item.status).length > 0 &&
          !isPositiveInspectionStatus(item.status),
      ),
  );
  const defectPhotosCaptured = defectItems.filter(
    (item) => item.photos.length,
  ).length;

  return {
    requiredTotal: requiredPhotos.length,
    requiredCaptured: capturedRequired,
    missingBuckets: requiredPhotos
      .filter((bucket) => !bucket.files.length)
      .map((bucket) => bucket.label),
    defectTotal: defectItems.length,
    defectPhotosCaptured,
    missingDefectPhotos: defectItems
      .filter((item) => !item.photos.length)
      .map((item) => item.label),
  };
}

function getEvidenceTargets(itemValues = {}) {
  return INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .map((item) => ({
        key: item.key,
        label: item.labelEn || item.labelHi || item.key,
        status: itemValues?.[item.key]?.status,
        eligible: isPhotoEligibleItem(item, section),
      }))
      .filter(
        (item) =>
          item.eligible &&
          normalizeStatusList(item.status).length > 0 &&
          !isPositiveInspectionStatus(item.status),
      ),
  );
}

function buildSmartAutoSummary({ lead, report, itemValues, mediaDiscipline }) {
  const allIssues = INSPECTION_SECTIONS.flatMap((section) =>
    section.items
      .map((item) => {
        const value = itemValues?.[item.key] || {};
        if (!value.status || isPositiveInspectionStatus(value.status)) {
          return null;
        }
        return {
          section: section.titleEn,
          label: item.labelEn,
          status: compactStatus(value.status),
          severity:
            value.severity || getStatusSeverity(value.status, item, section),
        };
      })
      .filter(Boolean),
  );

  const criticalIssues = allIssues.filter(
    (issue) => issue.severity === "Critical" || issue.severity === "High",
  );

  const worstSection = INSPECTION_SECTIONS.map((section) => ({
    key: section.key,
    title: section.titleEn,
    ...getSectionCounts(section, itemValues),
  })).sort((a, b) => b.issue - a.issue)[0];

  const bullets = [
    criticalIssues.length
      ? `${criticalIssues.length} major issue${criticalIssues.length > 1 ? "s" : ""} flagged across ${worstSection?.title || "the vehicle"}`
      : "No major structural or mechanical concern flagged in the filled checklist",
    mediaDiscipline.missingBuckets.length
      ? `${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal} mandatory photo buckets captured`
      : "All mandatory photo buckets captured for reviewer confidence",
    report?.estimatedRefurbCost
      ? `Expected refurb budget estimated at ${fmtInr(report.estimatedRefurbCost)}`
      : "Refurb budget still needs evaluator confirmation",
  ];

  const narrative = criticalIssues.length
    ? `Vehicle shows ${criticalIssues.length} major finding${criticalIssues.length > 1 ? "s" : ""}. Focus review on ${criticalIssues
        .slice(0, 3)
        .map((issue) => issue.label)
        .join(", ")} before price closure.`
    : `Vehicle looks commercially workable from the current inspection inputs. Review photo evidence, OEM checks, and pricing notes before moving ahead.`;

  return {
    bullets,
    narrative,
    criticalIssues: criticalIssues.slice(0, 6),
    allIssues,
  };
}

function DocumentPage({ children, className = "" }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1319] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_32%),linear-gradient(135deg,rgba(248,250,252,0.95),rgba(239,246,255,0.8))] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_32%),linear-gradient(135deg,rgba(15,19,25,0.98),rgba(20,30,47,0.92))]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[72px] font-black tracking-[0.22em] text-slate-100/80 dark:text-white/[0.03]">
        INSPECTION REPORT
      </div>
      <div className="relative p-6 md:p-8">{children}</div>
    </section>
  );
}

function DocumentStat({ label, value, helper, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-900 dark:text-slate-100",
    blue: "text-sky-700 dark:text-sky-300",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    rose: "text-rose-700 dark:text-rose-300",
  };
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-black tracking-tight ${toneMap[tone] || toneMap.slate}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function StatusChip({ status }) {
  const positive = isPositiveInspectionStatus(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
        status
          ? positive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
      }`}
    >
      {compactStatus(status)}
    </span>
  );
}

function ReportPhotoTile({ title, file, tagLabel }) {
  const src = getStoredFileSrc(file);
  const normalizedTitle = String(title || "").trim().toLowerCase();
  const normalizedTag = String(tagLabel || "").trim().toLowerCase();
  const showTagLabel = Boolean(tagLabel) && normalizedTag !== normalizedTitle;
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="aspect-[1.28/0.92] bg-slate-100 dark:bg-white/[0.05]">
        {src ? (
          <img
            src={src}
            alt={title}
            className="h-full w-full object-contain [image-rendering:auto]"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
            <CameraOutlined style={{ fontSize: 28 }} />
          </div>
        )}
      </div>
      <div className="px-3 py-2.5 text-center">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        {showTagLabel ? (
          <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Tag: {tagLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InspectionReportDocumentView({
  reportLead,
  onBack,
  onEdit,
  onDownload,
  printRef,
}) {
  const report = reportLead?.inspection?.report || {};
  const itemValues = report.items || {};
  const photoBuckets = report.photoBuckets || {};
  const bulkEvidence = normalizeEvidenceFiles(report.bulkEvidence || []);
  const leadVerification = report.leadVerification || {};
  const score = calcOverallScore(itemValues);
  const submittedAt =
    reportLead?.inspection?.submittedAt ||
    report?.generatedAt ||
    reportLead?.inspection?.startedAt ||
    new Date().toISOString();
  const leadDate =
    reportLead?.inspection?.rescheduledAt || reportLead?.inspectionScheduledAt;
  const verdict = reportLead?.inspection?.verdict || "Submitted";
  const bucketCards = PHOTO_BUCKETS.map((bucket) => ({
    title: bucket.labelEn,
    file:
      (photoBuckets[bucket.key] || [])[0] ||
      getTaggedEvidenceFile(bulkEvidence, [bucket.labelEn, bucket.key]) ||
      null,
  })).filter((entry) => entry.file);
  const mandatoryTagAliases = new Set(
    PHOTO_BUCKETS.flatMap((bucket) => [
      String(bucket.labelEn || "")
        .trim()
        .toLowerCase(),
      String(bucket.key || "")
        .trim()
        .toLowerCase(),
    ]),
  );
  const defectFromItems = INSPECTION_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => {
      const value = itemValues?.[item.key] || {};
      if (
        !normalizeStatusList(value.status).length ||
        isPositiveInspectionStatus(value.status)
      ) {
        return [];
      }
      return normalizeEvidenceFiles(value.photos || []).map((file) => ({
        title: item.labelEn,
        file: {
          ...file,
          evidenceTag: file.evidenceTag || item.labelEn,
        },
      }));
    }),
  );
  const defectFromBulk = bulkEvidence
    .map((file) => {
      const tag = String(getEvidenceTagLabel(file) || "")
        .trim()
        .toLowerCase();
      if (!tag || mandatoryTagAliases.has(tag)) return null;
      return {
        title: getEvidenceTagLabel(file),
        file,
      };
    })
    .filter(Boolean);
  const defectCards = Object.values(
    [...defectFromItems, ...defectFromBulk].reduce((acc, entry) => {
      const key =
        entry.file.publicId ||
        entry.file.url ||
        entry.file.preview ||
        entry.file.uid ||
        `${entry.title}-${Math.random().toString(36).slice(2, 8)}`;
      if (!acc[key]) acc[key] = entry;
      return acc;
    }, {}),
  );
  const heroPhoto =
    (photoBuckets.frontView || [])[0] ||
    getTaggedEvidenceFile(bulkEvidence, ["Front View", "frontView"]) ||
    (photoBuckets.leftSide || [])[0] ||
    getTaggedEvidenceFile(bulkEvidence, ["Left Side Profile", "leftSide"]) ||
    (photoBuckets.rightSide || [])[0] ||
    getTaggedEvidenceFile(bulkEvidence, ["Right Side Profile", "rightSide"]) ||
    bucketCards[0]?.file ||
    null;
  const bucketCardsWithFront = (() => {
    if (!heroPhoto) return bucketCards;
    const hasFrontCard = bucketCards.some(
      (entry) => String(entry.title || "").toLowerCase() === "front view",
    );
    if (hasFrontCard) return bucketCards;
    return [{ title: "Front View", file: heroPhoto }, ...bucketCards];
  })();
  const mandatoryChunks = chunkItems(bucketCardsWithFront, 4);
  const defectChunks = chunkItems(defectCards, 4);
  const summarySections = INSPECTION_SECTIONS.map((section) => ({
    ...section,
    completion: calcSectionScore(section.key, itemValues),
    ...getSectionCounts(section, itemValues),
  }));
  const mediaDiscipline = getMediaDiscipline(
    photoBuckets,
    itemValues,
    bulkEvidence,
  );
  const autoSummary = buildSmartAutoSummary({
    lead: reportLead,
    report,
    itemValues,
    mediaDiscipline,
  });
  const reportHighlights = [
    report?.registrationNumber || reportLead?.regNo || "Registration pending",
    reportLead?.mfgYear || "Year pending",
    reportLead?.fuel || "Fuel pending",
    report?.insuranceType ||
      reportLead?.insuranceCategory ||
      "Insurance pending",
    getMileage(reportLead) || "Kms pending",
  ];

  return (
    <section className="space-y-5">
      <style>{`
        @media print {
          .inspection-report-toolbar {
            display: none !important;
          }
          .inspection-report-pages {
            max-width: 100% !important;
          }
          .inspection-report-pages section {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="inspection-report-toolbar rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              <FileTextOutlined />
              Inspection Report
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px]">
              {report?.makeConfirmation || reportLead.make}{" "}
              {report?.modelConfirmation || reportLead.model}{" "}
              {report?.variantConfirmation || reportLead.variant}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {report?.customerName || reportLead.name} · {reportLead.mobile} ·
              Generated {fmt(submittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              className="!rounded-full"
            >
              Back to Queue
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={onDownload}
              className="!rounded-full"
            >
              Download Report
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={onEdit}
              className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
            >
              Continue Report
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={printRef}
        className="inspection-report-pages mx-auto max-w-[960px] space-y-6 pb-10"
      >
        <DocumentPage className="bg-[#f3f8ff] dark:bg-[#0f1622]">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700 dark:border-sky-500/30 dark:bg-white/[0.05] dark:text-sky-300">
                Smart inspection report
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                Comprehensive
                <br />
                Car Inspection Report
              </h1>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                Thorough vehicle health review with structured condition
                findings, compliance verification, photo evidence, and
                procurement-ready pricing guidance.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {reportHighlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-sky-100 bg-white/90 p-5 shadow-sm dark:border-sky-500/20 dark:bg-white/[0.04]">
              <div className="mb-5 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="aspect-[1.28/0.88]">
                  {heroPhoto ? (
                    <img
                      src={getStoredFileSrc(heroPhoto)}
                      alt={`${reportLead.make} ${reportLead.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <CameraOutlined style={{ fontSize: 40 }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    At a glance
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {report?.makeConfirmation || reportLead.make}{" "}
                    {report?.modelConfirmation || reportLead.model}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {report?.variantConfirmation ||
                      reportLead.variant ||
                      "Variant pending"}{" "}
                    · {reportLead.fuel || "Fuel pending"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                    Overall
                  </p>
                  <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {Math.max(1, Math.round(score / 20))}/5
                  </p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {score >= 80
                      ? "Excellent"
                      : score >= 60
                        ? "Good"
                        : score >= 40
                          ? "Fair"
                          : "Needs work"}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <DocumentStat
                  label="Inspection date"
                  value={fmt(submittedAt)}
                  helper="Report submitted"
                  tone="blue"
                />
                <DocumentStat
                  label="Inspection ID"
                  value={
                    reportLead?.inspection?.inspectionId || "Not generated"
                  }
                  helper="Evaluator job reference"
                />
                <DocumentStat
                  label="Verdict"
                  value={compactStatus(verdict)}
                  helper={
                    verdict === NOGO_REASON
                      ? "Lead closed at inspection"
                      : "Ready for next stage"
                  }
                  tone={verdict === NOGO_REASON ? "rose" : "green"}
                />
                <DocumentStat
                  label="Evaluator"
                  value={
                    reportLead?.inspection?.executiveName ||
                    reportLead?.assignedTo ||
                    "Pending"
                  }
                  helper={
                    reportLead?.inspection?.executiveMobile || "Mobile pending"
                  }
                />
                <DocumentStat
                  label="Customer"
                  value={report?.customerName || reportLead?.name || "Pending"}
                  helper={reportLead?.mobile || "Mobile pending"}
                />
                <DocumentStat
                  label="Registration"
                  value={
                    report?.registrationNumber || reportLead?.regNo || "Pending"
                  }
                  helper="Verified during inspection"
                />
                <DocumentStat
                  label="Insurance expiry"
                  value={
                    report?.insuranceExpiry
                      ? fmt(report.insuranceExpiry)
                      : "Pending"
                  }
                  helper={
                    getInsuranceDisplay(reportLead) || "Insurance type pending"
                  }
                  tone="amber"
                />
              </div>
              <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Health report summary
                </p>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {report?.overallRemarks || autoSummary.narrative}
                </p>
                <div className="mt-4 space-y-2">
                  {autoSummary.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Advanced report
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Content of report
              </h2>
            </div>
            <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              {INSPECTION_SECTIONS.length + 3} sections
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {[
              [
                "01",
                "Your report at a glance",
                "Overview of vehicle condition, identity, and headline outcome",
              ],
              [
                "02",
                "Inspection summary",
                "Category-wise ratings and completion summary",
              ],
              [
                "03",
                "Vehicle images",
                "Mandatory inspection photo evidence captured by evaluator",
              ],
              [
                "04",
                "Detailed evaluation",
                "Full section tables for every inspected part and system",
              ],
              [
                "05",
                "OEM installed features & specs",
                "Factory-fit features, counts, and evaluator pricing notes",
              ],
            ].map(([index, title, desc]) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-[22px] border border-sky-100 bg-sky-50/60 px-4 py-4 dark:border-sky-500/20 dark:bg-sky-500/5"
              >
                <span className="text-4xl font-black tracking-tight text-sky-200 dark:text-sky-500/30">
                  {index}
                </span>
                <div>
                  <p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Inspection report
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Inspection Summary
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                This section provides a quick section-wise view of the current
                car assessment so the next team can decide pricing, refurb
                depth, and whether the car should move ahead immediately.
              </p>
            </div>
            <ScoreBadge score={score} />
          </div>
          <div className="mt-6 space-y-4">
            {summarySections.map((section) => (
              <div
                key={section.key}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[1.05fr_0.95fr] md:items-center"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: section.color }}
                    >
                      {getSectionOrder(section.key)}
                    </span>
                    <p className="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {section.titleEn}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Perfect parts: {section.good} | Imperfect parts:{" "}
                    {section.issue}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Clean {section.good}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      Issues {section.issue}
                    </span>
                  </div>
                  <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {Math.max(0, Math.round(section.completion / 20))}/5
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                      Summary
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DocumentPage>

        <DocumentPage>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Evidence pack
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Mandatory Images
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              {bucketCardsWithFront.length} photos
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DocumentStat
              label="Mandatory captured"
              value={`${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal}`}
              helper={
                mediaDiscipline.missingBuckets.length
                  ? `${mediaDiscipline.missingBuckets.length} buckets still pending`
                  : "All mandatory photo buckets captured"
              }
              tone={mediaDiscipline.missingBuckets.length ? "amber" : "green"}
            />
            <DocumentStat
              label="Defect photos"
              value={`${mediaDiscipline.defectPhotosCaptured}/${mediaDiscipline.defectTotal}`}
              helper="Negative findings with evidence"
              tone={
                mediaDiscipline.defectPhotosCaptured ===
                mediaDiscipline.defectTotal
                  ? "green"
                  : "amber"
              }
            />
            <DocumentStat
              label="Verification"
              value={`${Object.values(leadVerification).filter(Boolean).length}/${LEAD_VERIFICATION_FIELDS.length}`}
              helper="Lead and document checks completed"
              tone="blue"
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {mandatoryChunks[0]?.length ? (
              mandatoryChunks[0].map((entry) => (
                <ReportPhotoTile
                  key={entry.title}
                  title={entry.title}
                  file={entry.file}
                  tagLabel={entry.title}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                Photo evidence abhi attach nahi hai.
              </div>
            )}
          </div>
        </DocumentPage>
        {mandatoryChunks.slice(1).map((chunk, chunkIndex) => (
          <DocumentPage key={`mandatory-images-${chunkIndex}`}>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Mandatory Images (contd.)
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {chunk.map((entry) => (
                <ReportPhotoTile
                  key={`${entry.title}-${entry.file?.uid || entry.file?.url || chunkIndex}`}
                  title={entry.title}
                  file={entry.file}
                  tagLabel={entry.title}
                />
              ))}
            </div>
          </DocumentPage>
        ))}
        <DocumentPage>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Evidence pack
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                All Defect Images
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              {defectCards.length} photos
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {defectChunks[0]?.length ? (
              defectChunks[0].map((entry, index) => (
                <ReportPhotoTile
                  key={`defect-photo-${index}-${entry.file?.uid || entry.file?.url || entry.title}`}
                  title={entry.title}
                  file={entry.file}
                  tagLabel={entry.title}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                No defect-tagged photos attached.
              </div>
            )}
          </div>
        </DocumentPage>
        {defectChunks.slice(1).map((chunk, chunkIndex) => (
          <DocumentPage key={`defect-images-${chunkIndex}`}>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              All Defect Images (contd.)
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {chunk.map((entry, index) => (
                <ReportPhotoTile
                  key={`defect-photo-contd-${chunkIndex}-${index}-${entry.file?.uid || entry.file?.url || entry.title}`}
                  title={entry.title}
                  file={entry.file}
                  tagLabel={entry.title}
                />
              ))}
            </div>
          </DocumentPage>
        ))}

        {INSPECTION_SECTIONS.map((section, index) => {
          const counts = getSectionCounts(section, itemValues);
          return (
            <DocumentPage key={section.key}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Inspection report
                  </p>
                  <h2 className="mt-2 text-[28px] font-black tracking-tight text-slate-950 dark:text-white">
                    {(index + 1).toString().padStart(2, "0")}. {section.titleEn}
                  </h2>
                </div>
                <div
                  className="rounded-[18px] border px-4 py-3 text-right"
                  style={{
                    borderColor: `${section.color}33`,
                    background: `${section.color}10`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ color: section.color }}
                  >
                    Perfect parts: {counts.good} | Imperfect parts:{" "}
                    {counts.issue}
                  </p>
                  <p
                    className="mt-1 text-lg font-black"
                    style={{ color: section.color }}
                  >
                    {Math.max(
                      0,
                      Math.round(
                        calcSectionScore(section.key, itemValues) / 20,
                      ),
                    )}
                    /5
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 dark:border-white/10">
                <div className="grid grid-cols-[1.7fr_0.7fr] gap-4 bg-sky-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:bg-sky-500/10 dark:text-slate-300">
                  <span>Parameters</span>
                  <span className="text-right">Condition</span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {section.items.map((item) => {
                    const itemValue = itemValues?.[item.key] || {};
                    return (
                      <div
                        key={item.key}
                        className="grid grid-cols-[1.7fr_0.7fr] gap-4 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.labelEn}
                          </p>
                          {itemValue.tyreBrand || itemValue.treadDepth ? (
                            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {[
                                itemValue.tyreBrand || "",
                                itemValue.treadDepth
                                  ? `${itemValue.treadDepth} mm`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="py-0.5 text-right">
                          <StatusChip status={itemValue.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </DocumentPage>
          );
        })}

        <DocumentPage>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                OEM installed features &amp; specs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Features, Specs &amp; Pricing Notes
              </h2>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <DocumentStat
                  label="Power windows"
                  value={report?.powerWindowCount || "Not captured"}
                  helper="Count verified during inspection"
                  tone="blue"
                />
                <DocumentStat
                  label="Airbags"
                  value={report?.airbagCount || "Not captured"}
                  helper="As seen physically / warning status"
                  tone="blue"
                />
                <DocumentStat
                  label="Make confirmed"
                  value={
                    report?.makeConfirmation ||
                    reportLead?.make ||
                    "Not captured"
                  }
                  helper="Lead + inspection confirmation"
                />
                <DocumentStat
                  label="Model confirmed"
                  value={
                    report?.modelConfirmation ||
                    reportLead?.model ||
                    "Not captured"
                  }
                  helper="Lead + inspection confirmation"
                />
                <DocumentStat
                  label="Variant confirmed"
                  value={
                    report?.variantConfirmation ||
                    reportLead?.variant ||
                    "Not captured"
                  }
                  helper="Lead + inspection confirmation"
                />
                <DocumentStat
                  label="Insurance type"
                  value={
                    report?.insuranceType ||
                    reportLead?.insuranceCategory ||
                    "Not captured"
                  }
                  helper="Copied from lead and confirmed"
                />
                <DocumentStat
                  label="Estimated refurb"
                  value={fmtInrOrPending(report?.estimatedRefurbCost)}
                  helper="Expected rectification budget"
                  tone="amber"
                />
                <DocumentStat
                  label="Suggested buy price"
                  value={fmtInrOrPending(report?.suggestedBuyPrice)}
                  helper="Seller ask minus refurb reserve"
                  tone="emerald"
                />
              </div>
            </div>
            
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Final remarks
                </p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {report?.overallRemarks ||
                    "Final evaluator remarks abhi available nahi hain."}
                </p>
                {leadDate ? (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Original inspection slot: {fmt(leadDate)}
                  </p>
                ) : null}
              </div>
            </div>
        </DocumentPage>
      </div>
    </section>
  );
}

function VisitUpdateModal({
  open,
  selectedLead,
  visitForm,
  onCancel,
  onSubmit,
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      centered
      width={640}
      okText="Save Visit Update"
      cancelText="Cancel"
      okButtonProps={{
        className:
          "!bg-slate-900 !font-bold dark:!bg-white dark:!text-slate-950",
      }}
      title={
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Inspection Visit Update
          </p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {selectedLead?.make} {selectedLead?.model}
            {selectedLead?.name ? ` — ${selectedLead.name}` : ""}
          </p>
        </div>
      }
    >
      <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">
        Yeh form tab use karo jab inspection field mein ho na saki ho. Actual
        inspection ke liye Start Inspection button use karo.
      </p>
      <Form form={visitForm} layout="vertical" size="middle">
        <Form.Item
          label="Kya reschedule karni hai? / Reschedule?"
          name="reschedule"
          rules={[{ required: true, message: "Option chunein." }]}
          className="!mb-4"
        >
          <Select
            placeholder="Chunein..."
            options={[
              { value: true, label: "Yes — Nayi date pe reschedule karo" },
              { value: false, label: "No — Sirf not-conducted mark karo" },
            ]}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}
        >
          {({ getFieldValue }) =>
            getFieldValue("reschedule") === true ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] mb-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  New Slot Details / Nayi Visit ki Jaankari
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Form.Item
                    label="New Date / Nayi Tithi"
                    name="rescheduleDate"
                    rules={[{ required: true, message: "Date chunein." }]}
                    className="!mb-0"
                  >
                    <DatePicker
                      className="w-full"
                      format="DD-MM-YYYY"
                      disabledDate={(d) => d && d.isBefore(dayjs(), "day")}
                    />
                  </Form.Item>
                  <Form.Item
                    label="New Time / Naya Samay"
                    name="rescheduleTime"
                    rules={[{ required: true, message: "Time chunein." }]}
                    className="!mb-0"
                  >
                    <TimePicker
                      className="w-full"
                      format="hh:mm A"
                      use12Hours
                    />
                  </Form.Item>
                  <Form.Item
                    label="Executive Name"
                    name="rescheduleExecutiveName"
                    rules={[
                      { required: true, message: "Executive naam bharo." },
                    ]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Field evaluator ka poora naam"
                    />
                  </Form.Item>
                  <Form.Item
                    label="Executive Mobile / Mobile Number"
                    name="rescheduleExecutiveMobile"
                    rules={[
                      { required: true, message: "Mobile number bharo." },
                    ]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </Form.Item>
                </div>
              </div>
            ) : null
          }
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.reschedule !== curr.reschedule}
        >
          {({ getFieldValue }) =>
            getFieldValue("reschedule") === false ? (
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                  Not Conducted — Kyun nahi hui?
                </p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Yeh lead Not Conducted mark ho jaayegi. Baad mein queue se
                  dobara start kar sakte ho.
                </p>
              </div>
            ) : null
          }
        </Form.Item>
        <Form.Item
          label="Remarks / Wajah aur Notes"
          name="remarks"
          rules={[
            { required: true, message: "Kuch remarks likhna zaroori hai." },
          ]}
          className="!mb-0"
        >
          <TextArea
            rows={3}
            placeholder="Seller ghar par nahi tha, gaadi nahi mili, documents missing, location change, ya koi aur wajah..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function UsedCarInspectionDesk() {
  const reportPrintRef = useRef(null);
  const advanceGuardRef = useRef({ itemKey: null, at: 0 });
  const advanceScrollTimeoutRef = useRef(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [queueFilter, setQueueFilter] = useState("Scheduled");
  const [search, setSearch] = useState("");
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [reportLeadId, setReportLeadId] = useState(null);
  const [reportMode, setReportMode] = useState("edit");
  const [activeSectionKeys, setActiveSectionKeys] = useState([
    INSPECTION_SECTIONS[0].key,
  ]);
  const [autoOpenItemKey, setAutoOpenItemKey] = useState(null);
  const [visitForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const watchedItems = Form.useWatch("items", reportForm);
  const watchedInspectionLocation = Form.useWatch(
    "inspectionLocation",
    reportForm,
  );
  const watchedRegistrationNumber = Form.useWatch(
    "registrationNumber",
    reportForm,
  );
  const watchedInsuranceType = Form.useWatch("insuranceType", reportForm);
  const watchedMakeConfirmation = Form.useWatch("makeConfirmation", reportForm);
  const watchedModelConfirmation = Form.useWatch(
    "modelConfirmation",
    reportForm,
  );
  const watchedVariantConfirmation = Form.useWatch(
    "variantConfirmation",
    reportForm,
  );
  const watchedInsuranceExpiry = Form.useWatch("insuranceExpiry", reportForm);
  const watchedInspectionDate = Form.useWatch("inspectionDate", reportForm);
  const watchedInspectionTime = Form.useWatch("inspectionTime", reportForm);
  const watchedBulkEvidence = Form.useWatch("bulkEvidence", reportForm);
  const watchedLeadVerification = Form.useWatch("leadVerification", reportForm);
  const watchedVerdict = Form.useWatch("verdict", reportForm);
  const watchedEvaluatorPrice = Form.useWatch("evaluatorPrice", reportForm);
  const [reportSyncTick, setReportSyncTick] = useState(0);
  const reportLead = leads.find((l) => l.id === reportLeadId) || null;
  const liveReportItems = useMemo(() => {
    const formItems = reportForm.getFieldValue("items");
    if (formItems && Object.keys(formItems).length) return formItems;
    if (watchedItems && Object.keys(watchedItems).length) return watchedItems;
    return reportLead?.inspection?.report?.items || {};
  }, [
    reportForm,
    reportLead?.inspection?.report?.items,
    reportSyncTick,
    watchedItems,
  ]);
  const liveBulkEvidence = useMemo(() => {
    const formFiles = normalizeEvidenceFiles(
      reportForm.getFieldValue("bulkEvidence") || [],
    );
    if (formFiles.length) return formFiles;
    const watchedFiles = normalizeEvidenceFiles(watchedBulkEvidence || []);
    if (watchedFiles.length) return watchedFiles;
    return normalizeEvidenceFiles(
      reportLead?.inspection?.report?.bulkEvidence || [],
    );
  }, [
    reportForm,
    reportLead?.inspection?.report?.bulkEvidence,
    reportSyncTick,
    watchedBulkEvidence,
  ]);
  const liveLeadVerification = useMemo(() => {
    const formValue = reportForm.getFieldValue("leadVerification");
    if (formValue && Object.keys(formValue).length) return formValue;
    if (
      watchedLeadVerification &&
      Object.keys(watchedLeadVerification).length
    ) {
      return watchedLeadVerification;
    }
    return reportLead?.inspection?.report?.leadVerification || {};
  }, [
    reportForm,
    reportLead?.inspection?.report?.leadVerification,
    reportSyncTick,
    watchedLeadVerification,
  ]);
  const evidenceTargets = getEvidenceTargets(liveReportItems || {});
  const usedEvidenceTags = useMemo(() => {
    const files = normalizeEvidenceFiles(liveBulkEvidence || []);
    return new Set(files.map((f) => getEvidenceTagLabel(f)).filter(Boolean));
  }, [liveBulkEvidence]);
  const evidenceTagSuggestions = useMemo(() => {
    const tags = buildEvidenceTags(liveBulkEvidence || [], evidenceTargets);
    return tags.includes("Others") ? tags : [...tags, "Others"];
  }, [evidenceTargets, liveBulkEvidence]);
  const evidenceTagCounts = useMemo(() => {
    return normalizeEvidenceFiles(liveBulkEvidence || []).reduce(
      (acc, file) => {
        const label = getEvidenceTagLabel(file);
        if (!label) return acc;
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {},
    );
  }, [liveBulkEvidence]);
  const bulkUploadInputRef = useRef(null);
  const forceReportSync = useCallback(
    () => setReportSyncTick((current) => current + 1),
    [],
  );

  useEffect(() => {
    return () => {
      if (advanceScrollTimeoutRef.current) {
        window.clearTimeout(advanceScrollTimeoutRef.current);
      }
    };
  }, []);

  const replaceLead = useCallback((lead) => {
    if (!lead) return;
    setLeads((current) => {
      const nextLead = normalizeLeadRecord(lead);
      const exists = current.some((item) => item.id === nextLead.id);
      return exists
        ? current.map((item) => (item.id === nextLead.id ? nextLead : item))
        : [nextLead, ...current];
    });
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usedCarsApi.listLeads({
        limit: 5000,
        includeClosed: true,
      });
      setLeads((response.data || []).map(normalizeLeadRecord));
    } catch (error) {
      message.error(error.message || "Could not load inspection queue.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateLead = useCallback((leadId, updater) => {
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead;
        const nextLead =
          typeof updater === "function"
            ? updater(lead)
            : { ...lead, ...updater };
        return normalizeLeadRecord(nextLead);
      }),
    );
  }, []);

  const persistLead = useCallback(
    async (lead) => {
      const response = await usedCarsApi.updateLead(lead.id, lead);
      replaceLead(response.data);
      return response.data;
    },
    [replaceLead],
  );

  useEffect(() => {
    if (!reportLeadId) return;
    const currentLead = leads.find((lead) => lead.id === reportLeadId);
    if (!currentLead) return;
    const nextAddress = normText(watchedInspectionLocation);
    const nextRegNo = normText(watchedRegistrationNumber);
    const nextInsuranceType = normText(watchedInsuranceType);
    const nextMake = normText(watchedMakeConfirmation);
    const nextModel = normText(watchedModelConfirmation);
    const nextVariant = normText(watchedVariantConfirmation);
    const nextInsuranceExpiry = watchedInsuranceExpiry
      ? dayjs(watchedInsuranceExpiry).toISOString()
      : "";

    if (
      nextAddress === (currentLead.address || "") &&
      nextRegNo === (currentLead.regNo || "") &&
      nextInsuranceType === (currentLead.insuranceCategory || "") &&
      nextMake === (currentLead.make || "") &&
      nextModel === (currentLead.model || "") &&
      nextVariant === (currentLead.variant || "") &&
      nextInsuranceExpiry === (currentLead.insuranceExpiry || "")
    ) {
      return;
    }

    updateLead(reportLeadId, (lead) => ({
      ...lead,
      address: nextAddress || lead.address,
      regNo: nextRegNo || lead.regNo,
      insuranceCategory: nextInsuranceType || lead.insuranceCategory,
      make: nextMake || lead.make,
      model: nextModel || lead.model,
      variant: nextVariant || lead.variant,
      insuranceExpiry: nextInsuranceExpiry || lead.insuranceExpiry || "",
    }));
  }, [
    leads,
    reportLeadId,
    updateLead,
    watchedInspectionLocation,
    watchedInsuranceType,
    watchedInsuranceExpiry,
    watchedMakeConfirmation,
    watchedModelConfirmation,
    watchedRegistrationNumber,
    watchedVariantConfirmation,
  ]);

  const inspectionPool = useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.status !== "Closed" &&
          (lead.pipelineStage === INSPECTION_QUEUE_STAGE ||
            lead.status === "Inspection Scheduled" ||
            Boolean(lead.inspection?.startedAt) ||
            Boolean(lead.inspection?.submittedAt)),
      ),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inspectionPool
      .filter((lead) => {
        if (q) {
          const haystack = [
            lead.name,
            lead.mobile,
            lead.regNo,
            lead.make,
            lead.model,
            lead.variant,
            lead.inspection?.inspectionId,
            lead.assignedTo,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        const state = getInspectionState(lead).key;
        const schedule =
          lead.inspection?.rescheduledAt || lead.inspectionScheduledAt;
        if (queueFilter === "Due Today")
          return Boolean(
            schedule &&
            dayjs(schedule).isSame(dayjs(), "day") &&
            state !== "completed",
          );
        if (queueFilter === "Scheduled") return state === "scheduled";
        if (queueFilter === "Rescheduled") return state === "rescheduled";
        if (queueFilter === "Draft") return state === "draft";
        if (queueFilter === "Completed") return state === "completed";
        return true;
      })
      .sort((a, b) => {
        const stateA = getInspectionState(a).key;
        const stateB = getInspectionState(b).key;
        const order = {
          draft: 0,
          scheduled: 1,
          rescheduled: 2,
          completed: 3,
          closed: 4,
        };
        if ((order[stateA] || 9) !== (order[stateB] || 9))
          return (order[stateA] || 9) - (order[stateB] || 9);
        const aAt = dayjs(
          a.inspection?.rescheduledAt || a.inspectionScheduledAt || 0,
        ).valueOf();
        const bAt = dayjs(
          b.inspection?.rescheduledAt || b.inspectionScheduledAt || 0,
        ).valueOf();
        return aAt - bAt;
      });
  }, [inspectionPool, queueFilter, search]);

  useEffect(() => {
    if (!filteredLeads.length) {
      setSelectedLeadId(null);
      return;
    }
    if (!filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead =
    filteredLeads.find((l) => l.id === selectedLeadId) ||
    filteredLeads[0] ||
    null;

  const summary = useMemo(() => {
    const scheduled = inspectionPool.filter(
      (l) => getInspectionState(l).key === "scheduled",
    ).length;
    const rescheduled = inspectionPool.filter(
      (l) => getInspectionState(l).key === "rescheduled",
    ).length;
    const draft = inspectionPool.filter(
      (l) => getInspectionState(l).key === "draft",
    ).length;
    const completed = inspectionPool.filter(
      (l) => getInspectionState(l).key === "completed",
    ).length;
    const nogo = inspectionPool.filter(
      (l) =>
        getInspectionState(l).key === "completed" &&
        l.inspection?.verdict === NOGO_REASON,
    ).length;
    const passed = completed - nogo;
    const dueToday = inspectionPool.filter((l) => {
      const s = l.inspection?.rescheduledAt || l.inspectionScheduledAt;
      return (
        s &&
        dayjs(s).isSame(dayjs(), "day") &&
        getInspectionState(l).key !== "completed"
      );
    }).length;
    return { scheduled, rescheduled, draft, completed, nogo, passed, dueToday };
  }, [inspectionPool]);
  const liveRefurbSummary = useMemo(
    () =>
      reportLead
        ? buildRefurbContext({
            lead: reportLead,
            values: {
              items: liveReportItems,
              insuranceType: watchedInsuranceType,
              insuranceExpiry: watchedInsuranceExpiry,
              evaluatorPrice: watchedEvaluatorPrice,
            },
          })
        : null,
    [
      liveReportItems,
      reportLead,
      watchedEvaluatorPrice,
      watchedInsuranceExpiry,
      watchedInsuranceType,
    ],
  );

  useEffect(() => {
    if (!reportLead || !liveRefurbSummary) return;
    const effectiveNoGo =
      watchedVerdict === NOGO_REASON ||
      (!watchedVerdict && liveRefurbSummary.noGo);
    const currentRefurb = Number(
      reportForm.getFieldValue("estimatedRefurbCost") || 0,
    );
    const nextRefurb = Number(effectiveNoGo ? 0 : liveRefurbSummary.totalCost || 0);
    const currentSuggested = Number(
      reportForm.getFieldValue("suggestedBuyPrice") || 0,
    );
    const nextSuggested = Number(
      effectiveNoGo ? 0 : liveRefurbSummary.suggestedBuyPrice || 0,
    );
    const rawOverall = normText(reportForm.getFieldValue("overallRemarks"));
    const currentOverall = stripNoGoNarrative(rawOverall);
    const autoNoGoLine = effectiveNoGo
      ? buildNoGoNarrative({
          ...liveRefurbSummary,
          noGoReasons: uniqStrings(liveRefurbSummary.noGoReasons || []),
        })
      : "";
    const nextOverall = effectiveNoGo
      ? [currentOverall, autoNoGoLine].filter(Boolean).join(" ")
      : currentOverall;

    if (
      currentRefurb === nextRefurb &&
      currentSuggested === nextSuggested &&
      rawOverall === nextOverall
    ) {
      return;
    }

    reportForm.setFieldsValue({
      estimatedRefurbCost: nextRefurb,
      suggestedBuyPrice: nextSuggested,
      overallRemarks: nextOverall,
    });
    forceReportSync();
  }, [
    forceReportSync,
    liveRefurbSummary,
    reportForm,
    reportLead,
    watchedVerdict,
  ]);

  const makeOptions = useMemo(
    () =>
      Array.from(new Set(leads.map((lead) => lead.make).filter(Boolean))).map(
        (value) => ({ value, label: value }),
      ),
    [leads],
  );

  const modelOptions = useMemo(() => {
    const activeMake =
      watchedMakeConfirmation || reportLead?.make || selectedLead?.make || "";
    return Array.from(
      new Set(
        leads
          .filter((lead) => !activeMake || lead.make === activeMake)
          .map((lead) => lead.model)
          .filter(Boolean),
      ),
    ).map((value) => ({ value, label: value }));
  }, [leads, reportLead?.make, selectedLead?.make, watchedMakeConfirmation]);

  const variantOptions = useMemo(() => {
    const activeMake =
      watchedMakeConfirmation || reportLead?.make || selectedLead?.make || "";
    const activeModel =
      watchedModelConfirmation ||
      reportLead?.model ||
      selectedLead?.model ||
      "";
    return Array.from(
      new Set(
        leads
          .filter(
            (lead) =>
              (!activeMake || lead.make === activeMake) &&
              (!activeModel || lead.model === activeModel),
          )
          .map((lead) => lead.variant)
          .filter(Boolean),
      ),
    ).map((value) => ({ value, label: value }));
  }, [
    leads,
    reportLead?.make,
    reportLead?.model,
    selectedLead?.make,
    selectedLead?.model,
    watchedMakeConfirmation,
    watchedModelConfirmation,
  ]);

  const insuranceTypeOptions = useMemo(
    () =>
      ["Comprehensive", "Zero-Dep", "Third Party", "Expired"].map((value) => ({
        value,
        label: value,
      })),
    [],
  );

  const openVisitUpdate = useCallback(
    (lead) => {
      setSelectedLeadId(lead.id);
      visitForm.setFieldsValue({
        reschedule: true,
        remarks: lead.inspection?.remarks || "",
        rescheduleDate: lead.inspection?.rescheduledAt
          ? dayjs(lead.inspection.rescheduledAt)
          : lead.inspectionScheduledAt
            ? dayjs(lead.inspectionScheduledAt)
            : dayjs(),
        rescheduleTime: lead.inspection?.rescheduledAt
          ? dayjs(lead.inspection.rescheduledAt)
          : lead.inspectionScheduledAt
            ? dayjs(lead.inspectionScheduledAt)
            : dayjs().add(2, "hour"),
        rescheduleExecutiveName:
          lead.inspection?.rescheduleExecutiveName ||
          lead.inspection?.executiveName ||
          lead.assignedTo ||
          "",
        rescheduleExecutiveMobile:
          lead.inspection?.rescheduleExecutiveMobile ||
          lead.inspection?.executiveMobile ||
          "",
      });
      setVisitModalOpen(true);
    },
    [visitForm],
  );

  const openInspectionReport = useCallback(
    (lead, mode = "edit") => {
      const existing = lead.inspection || {};
      const inspectionId =
        existing.inspectionId ||
        `INS-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      if (!existing.inspectionId || !existing.startedAt) {
        const startedLead = normalizeLeadRecord({
          ...lead,
          inspection: {
            ...lead.inspection,
            inspectionId,
            executiveName: existing.executiveName || lead.assignedTo || "",
            executiveMobile: existing.executiveMobile || "",
            startedAt: existing.startedAt || new Date().toISOString(),
            lastOutcome: existing.lastOutcome || "draft",
          },
          activities: existing.startedAt
            ? lead.activities
            : [
                mkActivity("inspection", "Inspection started", inspectionId),
                ...(lead.activities || []),
              ],
        });
        replaceLead(startedLead);
        persistLead(startedLead).catch((error) => {
          message.error(error.message || "Could not start inspection.");
          loadLeads();
        });
      }
      reportForm.setFieldsValue(
        buildReportValues({
          ...lead,
          inspection: {
            ...existing,
            inspectionId,
            startedAt: existing.startedAt || new Date().toISOString(),
          },
        }),
      );
      forceReportSync();
      setReportMode(mode);
      setActiveSectionKeys([INSPECTION_SECTIONS[0].key]);
      setAutoOpenItemKey(null);
      setReportLeadId(lead.id);
    },
    [forceReportSync, loadLeads, persistLead, replaceLead, reportForm],
  );

  const handleAdvanceToNextItem = useCallback((currentItemKey) => {
    const now = Date.now();
    if (
      advanceGuardRef.current.itemKey === currentItemKey &&
      now - advanceGuardRef.current.at < 180
    ) {
      return;
    }
    advanceGuardRef.current = { itemKey: currentItemKey, at: now };

    const flatItems = INSPECTION_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        sectionKey: section.key,
        itemKey: item.key,
      })),
    );
    const currentIndex = flatItems.findIndex(
      (entry) => entry.itemKey === currentItemKey,
    );
    if (currentIndex < 0 || currentIndex >= flatItems.length - 1) {
      const finalNode = document.querySelector("#inspection-final-decision");
      if (finalNode) {
        finalNode.scrollIntoView({
          behavior: "auto",
          block: "start",
          inline: "nearest",
        });
      }
      return;
    }
    const next = flatItems[currentIndex + 1];

    if (advanceScrollTimeoutRef.current) {
      window.clearTimeout(advanceScrollTimeoutRef.current);
    }
    setActiveSectionKeys([next.sectionKey]);
    setAutoOpenItemKey(next.itemKey);
    window.requestAnimationFrame(() => {
      scrollInspectionItemIntoView(next.itemKey);
    });
    advanceScrollTimeoutRef.current = window.setTimeout(() => {
      scrollInspectionItemIntoView(next.itemKey);
      window.setTimeout(() => scrollInspectionItemIntoView(next.itemKey), 120);
      window.setTimeout(() => scrollInspectionItemIntoView(next.itemKey), 220);
    }, 90);
  }, []);

  const handleTyreBrandSeed = useCallback(
    (sourceItemKey, value) => {
      if (sourceItemKey !== "frontLeftTyre" || !value) return;
      const patch = {};
      TYRE_ITEM_KEYS.filter((key) => key !== sourceItemKey).forEach((key) => {
        patch[key] = {
          ...(reportForm.getFieldValue(["items", key]) || {}),
          tyreBrand: value,
        };
      });
      reportForm.setFieldsValue({
        items: {
          ...(reportForm.getFieldValue("items") || {}),
          ...patch,
        },
      });
      forceReportSync();
    },
    [forceReportSync, reportForm],
  );

  const handleBulkEvidenceTag = useCallback(
    (uid, evidenceTag, customTagName = "") => {
      const currentFiles = normalizeEvidenceFiles(
        reportForm.getFieldValue("bulkEvidence") || [],
      );
      reportForm.setFieldsValue({
        bulkEvidence: currentFiles.map((file) =>
          file.uid === uid
            ? {
                ...file,
                evidenceTag,
                customTagName:
                  evidenceTag === "Others" ? normText(customTagName) : "",
              }
            : file,
        ),
      });
      forceReportSync();
    },
    [forceReportSync, reportForm],
  );

  const handleBulkEvidenceDelete = useCallback(
    (uid) => {
      const currentFiles = normalizeEvidenceFiles(
        reportForm.getFieldValue("bulkEvidence") || [],
      );
      reportForm.setFieldsValue({
        bulkEvidence: currentFiles.filter((file) => file.uid !== uid),
      });
      forceReportSync();
    },
    [forceReportSync, reportForm],
  );

  const handleBulkEvidenceUpload = useCallback(
    async (incomingFiles = []) => {
      const files = Array.from(incomingFiles || []).filter(Boolean);
      if (!files.length) return;
      try {
        message.loading({
          content: `Uploading ${files.length} photo${files.length > 1 ? "s" : ""}...`,
          key: "inspection-bulk-upload",
        });
        const uploaded = await uploadMultipleFiles(files);
        const currentFiles = normalizeEvidenceFiles(
          reportForm.getFieldValue("bulkEvidence") || [],
        );
        reportForm.setFieldsValue({
          bulkEvidence: [
            ...currentFiles,
            ...uploaded.map((file, index) => ({
              uid:
                file.public_id || file.publicId || `r2-${Date.now()}-${index}`,
              name: file.original_name || file.name || `Photo ${index + 1}`,
              status: "done",
              url: file.url || file.secure_url,
              thumbUrl: file.url || file.secure_url,
              preview: file.url || file.secure_url,
              publicId: file.public_id || file.publicId || "",
              format: file.format || "",
              size: file.size || 0,
              source: "r2",
              evidenceTag: "",
              customTagName: "",
            })),
          ],
        });
        forceReportSync();
        message.success({
          content: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded to evidence vault.`,
          key: "inspection-bulk-upload",
        });
      } catch (error) {
        message.error({
          content: error.message || "Could not upload evidence photos.",
          key: "inspection-bulk-upload",
        });
      }
    },
    [forceReportSync, reportForm],
  );

  const handleVisitUpdate = useCallback(async () => {
    if (!selectedLead) return;
    try {
      const values = await visitForm.validateFields();
      const nextAt =
        values.reschedule && values.rescheduleDate && values.rescheduleTime
          ? dayjs(values.rescheduleDate)
              .hour(dayjs(values.rescheduleTime).hour())
              .minute(dayjs(values.rescheduleTime).minute())
              .second(0)
              .toISOString()
          : null;
      const nextLead = normalizeLeadRecord({
        ...selectedLead,
        status: "Inspection Scheduled",
        pipelineStage: INSPECTION_QUEUE_STAGE,
        assignedTo:
          normText(values.rescheduleExecutiveName) ||
          selectedLead.inspection?.executiveName ||
          selectedLead.assignedTo,
        inspectionScheduledAt: nextAt || selectedLead.inspectionScheduledAt,
        inspection: {
          ...selectedLead.inspection,
          executiveName:
            normText(values.rescheduleExecutiveName) ||
            selectedLead.inspection?.executiveName ||
            selectedLead.assignedTo,
          executiveMobile:
            normText(values.rescheduleExecutiveMobile) ||
            selectedLead.inspection?.executiveMobile ||
            "",
          lastOutcome: values.reschedule ? "rescheduled" : "not-conducted",
          rescheduledAt: nextAt,
          rescheduleExecutiveName: normText(values.rescheduleExecutiveName),
          rescheduleExecutiveMobile: normText(values.rescheduleExecutiveMobile),
          remarks: normText(values.remarks),
        },
        activities: [
          mkActivity(
            "inspection",
            values.reschedule
              ? "Inspection rescheduled"
              : "Inspection not conducted",
            values.reschedule
              ? `${fmt(nextAt)} — ${normText(values.rescheduleExecutiveName)}`
              : normText(values.remarks) || "Visit not completed.",
          ),
          ...(selectedLead.activities || []),
        ],
      });
      replaceLead(nextLead);
      await persistLead(nextLead);
      setVisitModalOpen(false);
      visitForm.resetFields();
      message.success("Visit update save ho gaya.");
    } catch {}
  }, [persistLead, replaceLead, selectedLead, visitForm]);

  const handleSkipInspection = useCallback(
    (lead) => {
      if (!lead) return;
      Modal.confirm({
        title: "Skip inspection and move ahead?",
        content:
          "Ye lead bina inspection report ke directly Background Check stage mein move ho jayegi.",
        okText: "Skip & Move",
        cancelText: "Cancel",
        okButtonProps: {
          className:
            "!rounded-full !bg-amber-500 hover:!bg-amber-600 !border-amber-500",
        },
        onOk: async () => {
          const nowIso = new Date().toISOString();
          const nextLead = normalizeLeadRecord({
            ...lead,
            status: "Inspection Passed",
            pipelineStage: INSPECTION_DONE_STAGE,
            currentStage: "background-check",
            inspection: {
              ...(lead.inspection || {}),
              conducted: false,
              verdict: "Inspection Skipped",
              lastOutcome: "skipped",
              submittedAt: lead.inspection?.submittedAt || nowIso,
              inspectedAt: lead.inspection?.inspectedAt || nowIso,
              remarks:
                normText(lead.inspection?.remarks) ||
                "Inspection skipped. Lead moved to Background Check.",
            },
            activities: [
              mkActivity(
                "inspection",
                "Inspection skipped",
                "Lead moved directly to Background Check stage.",
              ),
              ...(lead.activities || []),
            ],
          });
          replaceLead(nextLead);
          await persistLead(nextLead);
          if (selectedLeadId === lead.id) {
            setSelectedLeadId(nextLead.id);
          }
          message.success(
            "Inspection skipped. Lead Background Check stage mein move ho gayi.",
          );
        },
      });
    },
    [persistLead, replaceLead, selectedLeadId],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!reportLead) return;
    try {
      const values = reportForm.getFieldsValue(true);
      const reportPayload = buildReportPayload(values, reportLead, {
        items: liveReportItems,
        bulkEvidence: liveBulkEvidence,
        leadVerification: liveLeadVerification,
      });
      const isNoGoDraft =
        values.verdict === NOGO_REASON || Boolean(reportPayload.refurb?.noGo);
      const nextLead = normalizeLeadRecord({
        ...reportLead,
        name: normText(values.customerName) || reportLead.name,
        address: normText(values.inspectionLocation) || reportLead.address,
        regNo: normText(values.registrationNumber) || reportLead.regNo,
        insuranceCategory:
          normText(values.insuranceType) || reportLead.insuranceCategory,
        make: normText(values.makeConfirmation) || reportLead.make,
        model: normText(values.modelConfirmation) || reportLead.model,
        variant: normText(values.variantConfirmation) || reportLead.variant,
        insuranceExpiry: values.insuranceExpiry
          ? dayjs(values.insuranceExpiry).toISOString()
          : reportLead.insuranceExpiry || "",
        status: "Inspection Scheduled",
        pipelineStage: INSPECTION_QUEUE_STAGE,
        currentStage: "inspection",
        isClosed: false,
        closureReason: "",
        closureNotes: "",
        closedAt: null,
        inspection: {
          ...reportLead.inspection,
          inspectionId:
            values.inspectionId || reportLead.inspection?.inspectionId || "",
          executiveName: normText(values.executiveName),
          executiveMobile: normText(values.executiveMobile),
          startedAt:
            reportLead.inspection?.startedAt || new Date().toISOString(),
          lastOutcome: "draft",
          verdict: values.verdict || reportLead.inspection?.verdict || "",
          noGoReason: isNoGoDraft
            ? normText(values.noGoReason) ||
              reportPayload.noGoReasons?.[0] ||
              ""
            : "",
          remarks: reportPayload.overallRemarks,
          noGoReasons: isNoGoDraft ? reportPayload.noGoReasons || [] : [],
          report: reportPayload,
          reportVersion: REPORT_VERSION,
        },
      });
      replaceLead(nextLead);
      await persistLead(nextLead);
      message.success("Draft save ho gaya — koi bhi data lost nahi hua.");
    } catch (error) {
      message.error(error.message || "Could not save inspection draft.");
      loadLeads();
    }
  }, [
    liveBulkEvidence,
    liveLeadVerification,
    liveReportItems,
    loadLeads,
    persistLead,
    replaceLead,
    reportForm,
    reportLead,
  ]);

  const handleSubmitReport = useCallback(async () => {
    if (!reportLead) return;
    try {
      await reportForm.validateFields();
      const values = reportForm.getFieldsValue(true);
      const reportPayload = buildReportPayload(values, reportLead, {
        items: liveReportItems,
        bulkEvidence: liveBulkEvidence,
        leadVerification: liveLeadVerification,
      });
      const inspectedAt = dayjs(values.inspectionDate)
        .hour(dayjs(values.inspectionTime).hour())
        .minute(dayjs(values.inspectionTime).minute())
        .second(0)
        .toISOString();
      const verdict = values.verdict;
      const isNogo =
        verdict === NOGO_REASON || (!verdict && reportPayload.refurb?.noGo);
      const nextInspection = {
        ...reportLead.inspection,
        inspectionId:
          values.inspectionId || reportLead.inspection?.inspectionId,
        executiveName: normText(values.executiveName),
        executiveMobile: normText(values.executiveMobile),
        startedAt: reportLead.inspection?.startedAt || new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        inspectedAt,
        lastOutcome: isNogo ? "no-go" : "completed",
        verdict: isNogo ? NOGO_REASON : verdict,
        noGoReason: isNogo
          ? normText(values.noGoReason) || reportPayload.noGoReasons?.[0] || ""
          : "",
        noGoReasons: isNogo ? reportPayload.noGoReasons || [] : [],
        remarks: reportPayload.overallRemarks,
        reportVersion: REPORT_VERSION,
        report: reportPayload,
      };
      const nextLead = normalizeLeadRecord(
        isNogo
          ? {
              ...reportLead,
              name: normText(values.customerName) || reportLead.name,
              address:
                normText(values.inspectionLocation) || reportLead.address,
              regNo: normText(values.registrationNumber) || reportLead.regNo,
              insuranceCategory:
                normText(values.insuranceType) || reportLead.insuranceCategory,
              make: normText(values.makeConfirmation) || reportLead.make,
              model: normText(values.modelConfirmation) || reportLead.model,
              variant:
                normText(values.variantConfirmation) || reportLead.variant,
              insuranceExpiry: values.insuranceExpiry
                ? dayjs(values.insuranceExpiry).toISOString()
                : reportLead.insuranceExpiry || "",
              status: "Closed",
              pipelineStage: "Lead Closed",
              currentStage: "closed",
              isClosed: true,
              closureReason: NOGO_REASON,
              closureNotes:
                normText(values.noGoReason) ||
                reportPayload.noGoReasons?.join(", ") ||
                "",
              notes:
                normText(values.noGoReason) ||
                reportPayload.noGoReasons?.join(", ") ||
                reportLead.notes,
              inspection: nextInspection,
              activities: [
                mkActivity(
                  "lead-closed",
                  "Lead closed from inspection — No-Go",
                  reportPayload.noGoReasons?.join(", ") ||
                    normText(values.noGoReason) ||
                    "No-go car after inspection.",
                ),
                ...(reportLead.activities || []),
              ],
            }
          : {
              ...reportLead,
              name: normText(values.customerName) || reportLead.name,
              address:
                normText(values.inspectionLocation) || reportLead.address,
              regNo: normText(values.registrationNumber) || reportLead.regNo,
              insuranceCategory:
                normText(values.insuranceType) || reportLead.insuranceCategory,
              make: normText(values.makeConfirmation) || reportLead.make,
              model: normText(values.modelConfirmation) || reportLead.model,
              variant:
                normText(values.variantConfirmation) || reportLead.variant,
              insuranceExpiry: values.insuranceExpiry
                ? dayjs(values.insuranceExpiry).toISOString()
                : reportLead.insuranceExpiry || "",
              status: "Inspection Passed",
              pipelineStage: INSPECTION_DONE_STAGE,
              currentStage: "background-check",
              isClosed: false,
              closureReason: "",
              closureNotes: "",
              closedAt: null,
              inspection: nextInspection,
              activities: [
                mkActivity(
                  "inspection",
                  "Inspection completed — Passed",
                  normText(values.overallRemarks) ||
                    "Vehicle cleared for next stage.",
                ),
                ...(reportLead.activities || []),
              ],
            },
      );
      replaceLead(nextLead);
      await persistLead(nextLead);
      setSelectedLeadId(nextLead.id);
      setReportLeadId(nextLead.id);
      setReportMode("view");
      message.success(
        isNogo
          ? "No-go report submit hua. Lead band kar di gayi."
          : "Inspection report submit ho gaya. Vehicle aage bhej diya.",
      );
    } catch (error) {
      if (Array.isArray(error?.errorFields) && error.errorFields.length) {
        message.error(
          "Kuch required fields bhari nahi hain. Please check karein.",
        );
        return;
      }
      message.error(
        error?.message || "Inspection submit karte waqt issue aaya.",
      );
    }
  }, [
    liveBulkEvidence,
    liveLeadVerification,
    liveReportItems,
    persistLead,
    reportForm,
    reportLead,
    replaceLead,
  ]);

  const handleDownloadReport = useCallback(async () => {
    if (!reportLead) return;
    try {
      const reportFileName = reportLead?.inspection?.inspectionId
        ? `${reportLead.inspection.inspectionId}-report.pdf`
        : "inspection-report.pdf";
      const blob = await usedCarsApi.downloadInspectionReportPdf(reportLead.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = reportFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success("Inspection report PDF download ho gaya.");
    } catch (error) {
      message.error(
        error?.message || "PDF download karte waqt issue aaya. Retry karein.",
      );
    }
  }, [reportLead]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center rounded-[32px] border border-slate-200 bg-white text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-black dark:text-slate-300">
        Loading inspection queue...
      </div>
    );
  }

  if (reportLeadId && reportLead) {
    const reportReadOnly = reportMode === "view";
    if (reportReadOnly) {
      return (
        <InspectionReportDocumentView
          reportLead={reportLead}
          onDownload={handleDownloadReport}
          printRef={reportPrintRef}
          onBack={() => {
            setReportLeadId(null);
            setReportMode("edit");
          }}
          onEdit={() => setReportMode("edit")}
        />
      );
    }
    const reportItems = liveReportItems;
    const totalChecklistItems = INSPECTION_SECTIONS.reduce(
      (sum, section) => sum + section.items.length,
      0,
    );
    const answeredChecklistItems = INSPECTION_SECTIONS.reduce(
      (sum, section) => {
        const counts = getSectionCounts(section, reportItems);
        return sum + counts.good + counts.issue;
      },
      0,
    );
    const currentBulkEvidence = liveBulkEvidence;
    const currentPhotoBuckets =
      buildPhotoBucketsFromEvidence(currentBulkEvidence);
    const mediaDiscipline = getMediaDiscipline(
      currentPhotoBuckets,
      reportItems,
      currentBulkEvidence,
    );
    return (
      <section className="space-y-4">
        <style>{`
          .used-car-inspection-collapse .ant-motion-collapse,
          .used-car-inspection-collapse .ant-collapse-content,
          .used-car-inspection-collapse .ant-collapse-content-box {
            transition: none !important;
            animation: none !important;
          }
        `}</style>
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black md:p-5 xl:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                <FileTextOutlined />
                Inspection Report
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px]">
                {reportLead.make} {reportLead.model} {reportLead.variant}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                {reportLead.name} · {reportLead.mobile} ·{" "}
                {reportLead.regNo || "Registration pending"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setReportLeadId(null);
                  setReportMode("edit");
                }}
                className="!rounded-full"
              >
                Back to Queue
              </Button>
              {reportReadOnly ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  View Report
                </span>
              ) : null}
            </div>
          </div>
          <ReportSummaryCard
            reportLead={reportLead}
            reportItems={reportItems}
            liveValues={{
              registrationNumber: watchedRegistrationNumber,
              insuranceType: watchedInsuranceType,
              makeConfirmation: watchedMakeConfirmation,
              modelConfirmation: watchedModelConfirmation,
              variantConfirmation: watchedVariantConfirmation,
              inspectionDate: watchedInspectionDate,
              inspectionTime: watchedInspectionTime,
            }}
          />
          {/* Red Flag strip has been intentionally removed per request */}
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black md:p-5 xl:p-6">
          <Form
            form={reportForm}
            layout="vertical"
            size="middle"
            disabled={reportReadOnly}
            onValuesChange={() => forceReportSync()}
          >
            <Form.Item name="bulkEvidence" hidden preserve>
              <FormValueSink />
            </Form.Item>
            <Form.Item name="leadVerification" hidden preserve>
              <FormValueSink />
            </Form.Item>
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Visit Details
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item
                      label="Inspection ID"
                      name="inspectionId"
                      rules={[{ required: true, message: "ID required hai." }]}
                      className="!mb-0"
                    >
                      <Input
                        readOnly
                        prefix={<FileTextOutlined />}
                        className="!bg-slate-100 dark:!bg-white/5"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Executive"
                      name="executiveName"
                      rules={[
                        { required: true, message: "Executive naam bharo." },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Evaluator ka poora naam"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Customer Name"
                      name="customerName"
                      rules={[
                        { required: true, message: "Customer name bharo." },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Seller / customer ka naam"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Contact No. / Mobile Number"
                      name="executiveMobile"
                      rules={[
                        { required: true, message: "Mobile number bharo." },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Inspection Location</span>
                        </div>
                      }
                      name="inspectionLocation"
                      rules={[{ required: true, message: "Location bharo." }]}
                      className="!mb-0"
                    >
                      <Input placeholder="Seller ka ghar ya showroom address" />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Registration Number</span>
                        </div>
                      }
                      name="registrationNumber"
                      rules={[
                        {
                          required: true,
                          message: "Registration number bharo.",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input placeholder="e.g. HR26DE9898" />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Insurance Type</span>
                        </div>
                      }
                      name="insuranceType"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        placeholder="Insurance type select karo"
                        options={insuranceTypeOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Insurance Expiry"
                      name="insuranceExpiry"
                      className="!mb-0"
                    >
                      <DatePicker className="w-full" format="DD-MM-YYYY" />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Date / Tithi"
                      name="inspectionDate"
                      rules={[{ required: true, message: "Date chunein." }]}
                      className="!mb-0"
                    >
                      <DatePicker className="w-full" format="DD-MM-YYYY" />
                    </Form.Item>
                    <Form.Item
                      label="Inspection Time / Samay"
                      name="inspectionTime"
                      rules={[{ required: true, message: "Time chunein." }]}
                      className="!mb-0"
                    >
                      <TimePicker
                        className="w-full"
                        format="hh:mm A"
                        use12Hours
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Lead Verification
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {LEAD_VERIFICATION_FIELDS.map((field) => (
                      <VerificationCard
                        key={`${reportLeadId || "inspection"}-${field.key}`}
                        field={field}
                        checked={Boolean(liveLeadVerification?.[field.key])}
                        onToggle={(next) => {
                          reportForm.setFieldsValue({
                            leadVerification: {
                              ...(reportForm.getFieldValue(
                                "leadVerification",
                              ) || {}),
                              [field.key]: next,
                            },
                          });
                          forceReportSync();
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Make Confirmation</span>
                        </div>
                      }
                      name="makeConfirmation"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        showSearch
                        placeholder="Make confirm karo"
                        options={makeOptions}
                        onChange={() => {
                          reportForm.setFieldsValue({
                            modelConfirmation: undefined,
                            variantConfirmation: undefined,
                          });
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Model Confirmation</span>
                        </div>
                      }
                      name="modelConfirmation"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        showSearch
                        placeholder="Model confirm karo"
                        options={modelOptions}
                        onChange={() =>
                          reportForm.setFieldValue(
                            "variantConfirmation",
                            undefined,
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Variant Confirmation</span>
                        </div>
                      }
                      name="variantConfirmation"
                      className="!mb-0"
                    >
                      <Select
                        allowClear
                        showSearch
                        placeholder="Variant confirm karo"
                        options={variantOptions}
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <DocumentStat
                      label="Mandatory captured"
                      value={`${mediaDiscipline.requiredCaptured}/${mediaDiscipline.requiredTotal}`}
                      helper={
                        mediaDiscipline.missingBuckets.length
                          ? `${mediaDiscipline.missingBuckets.length} still pending`
                          : "All mandatory buckets complete"
                      }
                      tone={
                        mediaDiscipline.missingBuckets.length
                          ? "amber"
                          : "green"
                      }
                    />
                    <DocumentStat
                      label="Defect photos"
                      value={`${mediaDiscipline.defectPhotosCaptured}/${mediaDiscipline.defectTotal}`}
                      helper="Evidence against marked defects"
                      tone={
                        mediaDiscipline.defectPhotosCaptured ===
                        mediaDiscipline.defectTotal
                          ? "green"
                          : "amber"
                      }
                    />
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Evidence Vault
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Upload all field photos together, then tag them
                          against mandatory buckets or imperfect parts.
                        </p>
                      </div>
                      <Button
                        icon={<CameraOutlined />}
                        className="!rounded-full"
                        onClick={() => bulkUploadInputRef.current?.click()}
                      >
                        Bulk Upload Photos
                      </Button>
                    </div>
                    <input
                      ref={bulkUploadInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={(event) => {
                        handleBulkEvidenceUpload(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {evidenceTagSuggestions.map((label) => {
                        const isUsed = usedEvidenceTags.has(label);
                        const count = evidenceTagCounts[label] || 0;
                        return (
                          <span
                            key={`evidence-tag-${label}`}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              isUsed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-[#11151b] dark:text-slate-400"
                            }`}
                          >
                            {isUsed ? `✓ ${label}` : label}
                            {count ? ` (${count})` : ""}
                          </span>
                        );
                      })}
                    </div>
                    {currentBulkEvidence.length ? (
                      <div className="mt-4 space-y-2">
                        {currentBulkEvidence.map((file) => {
                          const fileSrc =
                            file.thumbUrl ||
                            file.url ||
                            file.preview ||
                            (file.originFileObj
                              ? URL.createObjectURL(file.originFileObj)
                              : "");
                          const availableTags = evidenceTagSuggestions.filter(
                            (tag) =>
                              tag === file.evidenceTag ||
                              tag === "Others" ||
                              !usedEvidenceTags.has(tag),
                          );
                          const isOtherTag = file.evidenceTag === "Others";
                          return (
                            <div
                              key={file.uid}
                              className="flex items-stretch gap-3 rounded-[16px] border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.03]"
                            >
                              <div className="w-1/4 shrink-0 overflow-hidden rounded-[12px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                                {fileSrc ? (
                                  <img
                                    src={fileSrc}
                                    alt={file.name}
                                    className="h-full w-full object-cover"
                                    style={{ minHeight: 64, maxHeight: 96 }}
                                  />
                                ) : (
                                  <div className="flex h-full min-h-[64px] items-center justify-center text-slate-300 dark:text-slate-600">
                                    <CameraOutlined style={{ fontSize: 22 }} />
                                  </div>
                                )}
                              </div>
                                <div className="flex flex-1 flex-col justify-center gap-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                                      {file.name}
                                    </p>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() =>
                                        handleBulkEvidenceDelete(file.uid)
                                      }
                                      className="!h-6 !w-6 !min-w-6 !rounded-full !p-0 !text-slate-400 hover:!text-rose-600 dark:!text-slate-500 dark:hover:!text-rose-400"
                                    />
                                  </div>
                                  <Select
                                    size="small"
                                    value={file.evidenceTag || undefined}
                                  onChange={(value) =>
                                    handleBulkEvidenceTag(file.uid, value)
                                  }
                                  placeholder="Tag this photo..."
                                  className="w-full"
                                  options={availableTags.map((tag) => ({
                                    value: tag,
                                    label: tag,
                                  }))}
                                  showSearch
                                  allowClear
                                  filterOption={(input, option) =>
                                    (option?.label ?? "")
                                      .toLowerCase()
                                      .includes(input.toLowerCase())
                                  }
                                />
                                {isOtherTag ? (
                                  <Input
                                    size="small"
                                    placeholder="Enter custom tag name"
                                    value={file.customTagName || ""}
                                    onChange={(event) =>
                                      handleBulkEvidenceTag(
                                        file.uid,
                                        "Others",
                                        event.target.value,
                                      )
                                    }
                                  />
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[16px] border border-dashed border-slate-200 px-4 py-4 text-sm font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
                        No photos uploaded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Detailed Inspection Checklist
                      </p>
                      <p className="mt-1 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Work top to bottom. Clean parts move fast, imperfect
                        visual parts ask for evidence.
                      </p>
                    </div>
                  </div>
                </div>
                <Collapse
                  ghost
                  activeKey={activeSectionKeys}
                  onChange={(keys) =>
                    setActiveSectionKeys(Array.isArray(keys) ? keys : [keys])
                  }
                  className="used-car-inspection-collapse !bg-transparent"
                >
                  {INSPECTION_SECTIONS.map((section) => {
                    const counts = getSectionCounts(section, reportItems);
                    const answeredCount = counts.good + counts.issue;
                    return (
                      <Panel
                        key={section.key}
                        className="!mb-3 !rounded-[22px] !border !border-slate-200 !bg-white dark:!border-white/10 dark:!bg-[#11151b]"
                        header={
                          <div className="flex items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white"
                                style={{ background: section.color }}
                              >
                                {getSectionOrder(section.key)}
                              </span>
                              <div>
                                <p className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                                  {section.titleEn}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
                                    {answeredCount}/{section.items.length}{" "}
                                    answered
                                  </span>
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    Clean {counts.good}
                                  </span>
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                    Issues {counts.issue}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      >
                        <div className="grid gap-3">
                          {section.items.map((item) => (
                            <SectionItemCard
                              key={`${reportLeadId || "inspection"}-${item.key}`}
                              item={item}
                              section={section}
                              formName="items"
                              itemValue={reportItems?.[item.key] || {}}
                              autoOpen={autoOpenItemKey === item.key}
                              clearAutoOpen={() => setAutoOpenItemKey(null)}
                              onAdvance={handleAdvanceToNextItem}
                              onSeedTyreBrand={handleTyreBrandSeed}
                              onValueChange={forceReportSync}
                            />
                          ))}
                        </div>
                      </Panel>
                    );
                  })}
                </Collapse>

                <div
                  id="inspection-final-decision"
                  className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Final Decision
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Form.Item
                      label="Inspection Result / Natija"
                      name="verdict"
                      rules={[{ required: true, message: "Verdict chunein." }]}
                      className="!mb-0"
                    >
                      <Select
                        placeholder="Pass ya No-Go?"
                        options={[
                          {
                            value: "Inspection Passed",
                            label: "Inspection Passed — Gaadi theek hai",
                          },
                          {
                            value: NOGO_REASON,
                            label: "No-Go Car — Yeh gaadi nahi chalegi",
                          },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Estimated Refurb Cost / Theek karne ka kharcha"
                      name="estimatedRefurbCost"
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        readOnly
                        placeholder="e.g. 25000"
                        formatter={(v) =>
                          `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Suggested Buy Price / Suggest ki hui buy price"
                      name="suggestedBuyPrice"
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        readOnly
                        formatter={(v) =>
                          `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.verdict !== curr.verdict}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue("verdict") === NOGO_REASON ? (
                        <div className="mt-3">
                          <Form.Item
                            label="No-Go Reason / No-Go ki Wajah"
                            name="noGoReason"
                            rules={[
                              {
                                required: true,
                                message: "No-Go ki wajah likhna zaroori hai.",
                              },
                            ]}
                            className="!mb-0"
                          >
                            <Select
                              placeholder="No-Go ki wajah chunein..."
                              showSearch
                              allowClear
                              options={NOGO_REASONS.map((v) => ({
                                value: v,
                                label: v,
                              }))}
                            />
                          </Form.Item>
                        </div>
                      ) : null
                    }
                  </Form.Item>
                  <div className="mt-3">
                    <Form.Item
                      label="Overall Remarks / Saari Baatein"
                      name="overallRemarks"
                      rules={[
                        {
                          required: true,
                          message: "Overall remarks likhna zaroori hai.",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <TextArea
                        rows={4}
                        placeholder="Poori inspection ka summary — kya theek hai, kya nahi, resale view, aur koi bhi zaroori baat..."
                      />
                    </Form.Item>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                {reportMode !== "view" ? (
                  <div className="sticky bottom-4 z-[90] mt-6 flex items-center justify-between rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-[#090b0e]/95 lg:px-6">
                  <div className="flex items-center gap-3">
                      <ScoreBadge score={calcOverallScore(reportItems)} />
                      <div className="hidden sm:block">
                        <p className="text-[11px] font-bold text-slate-500 lg:text-xs dark:text-slate-400">
                          {answeredChecklistItems} / {totalChecklistItems}{" "}
                          Answered
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => {
                          setReportLeadId(null);
                          setReportMode("edit");
                        }}
                        className="hidden md:inline-flex !rounded-full"
                      >
                        Back
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleSaveDraft}
                        className="!rounded-full"
                      >
                        <span className="hidden sm:inline">Save Draft</span>
                        <span className="inline sm:hidden">Save</span>
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmitReport}
                        className="!rounded-full !bg-sky-600 !px-4 !font-bold dark:!bg-sky-500 lg:!px-5"
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Form>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        <QueueMetric
          label="Scheduled"
          value={summary.scheduled}
          helper="Fresh queue — field visit pending"
        />
        <QueueMetric
          label="Due Today"
          value={summary.dueToday}
          helper="Aaj ki inspections"
          tone="sky"
        />
        <QueueMetric
          label="Rescheduled"
          value={summary.rescheduled}
          helper="Visit moved to new slot"
          tone="amber"
        />
        <QueueMetric
          label="Draft Reports"
          value={summary.draft}
          helper="Started, submit pending"
          tone="violet"
        />
        <QueueMetric
          label="Completed"
          value={summary.completed}
          helper="Reports submitted"
          tone="emerald"
        />
        <QueueMetric
          label="Passed"
          value={summary.passed}
          helper="Ready for next stage"
          tone="emerald"
        />
        <QueueMetric
          label="No-Go"
          value={summary.nogo}
          helper="Closed at inspection desk"
          tone="rose"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.34fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Inspection Queue
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                Vehicles ready for field evaluation
              </h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {filteredLeads.length} vehicles
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUEUE_FILTERS.map((item) => {
              const active = queueFilter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQueueFilter(item)}
                  className={`rounded-full px-3 py-2 text-xs font-bold tracking-tight transition-all ${active ? "bg-slate-900 text-white dark:bg-black dark:text-white dark:border dark:border-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search seller, reg no, vehicle or inspection ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <InspectionQueueCard
                  key={lead.id}
                  lead={lead}
                  active={selectedLead?.id === lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-8 dark:border-white/10 dark:bg-white/[0.03]">
                <Empty description="Is filter mein koi inspection nahi mila." />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black md:p-5 xl:p-6">
          {selectedLead ? (
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                    <FileTextOutlined />
                    Inspection Desk
                  </div>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {selectedLead.make} {selectedLead.model}{" "}
                    {selectedLead.variant}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {selectedLead.name} · {selectedLead.mobile} ·{" "}
                    {selectedLead.regNo || "Registration pending"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getInspectionState(selectedLead).tone}`}
                  >
                    {getInspectionState(selectedLead).label}
                  </span>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => openVisitUpdate(selectedLead)}
                    className="!rounded-full"
                  >
                    Visit Update
                  </Button>
                  {!selectedLead.inspection?.submittedAt ? (
                    <Button
                      icon={<RightOutlined />}
                      onClick={() => handleSkipInspection(selectedLead)}
                      className="!rounded-full !border-amber-300 !text-amber-700 hover:!border-amber-400 hover:!text-amber-800 dark:!border-amber-500/40 dark:!text-amber-300 dark:hover:!border-amber-500 dark:hover:!text-amber-200"
                    >
                      Skip Inspection
                    </Button>
                  ) : null}
                  {selectedLead.inspection?.submittedAt ? (
                    <>
                      <Button
                        icon={<FileSearchOutlined />}
                        onClick={() =>
                          openInspectionReport(selectedLead, "view")
                        }
                        className="!rounded-full"
                      >
                        View Report
                      </Button>
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() => openInspectionReport(selectedLead)}
                        className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
                      >
                        Continue Report
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={
                        selectedLead.inspection?.startedAt ? (
                          <FileTextOutlined />
                        ) : (
                          <PlayCircleOutlined />
                        )
                      }
                      onClick={() => openInspectionReport(selectedLead)}
                      className="!rounded-full !bg-slate-900 !px-4 !font-bold dark:!bg-white dark:!text-slate-950"
                    >
                      {selectedLead.inspection?.startedAt
                        ? "Continue Report"
                        : "Start Inspection"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QueueMetric
                  label="Inspection Executive"
                  value={
                    selectedLead.inspection?.executiveName ||
                    selectedLead.assignedTo ||
                    "Pending"
                  }
                  helper={
                    selectedLead.inspection?.executiveMobile ||
                    "Contact not captured"
                  }
                />
                <QueueMetric
                  label="Scheduled For"
                  value={
                    selectedLead.inspection?.rescheduledAt ||
                    selectedLead.inspectionScheduledAt
                      ? fmt(
                          selectedLead.inspection?.rescheduledAt ||
                            selectedLead.inspectionScheduledAt,
                        )
                      : "Not scheduled"
                  }
                  helper="Current field visit slot"
                />
                <QueueMetric
                  label="Seller Ask"
                  value={fmtInrOrPending(getPrice(selectedLead))}
                  helper={`${getMileage(selectedLead) || "Kms pending"} · ${selectedLead.ownership || "Ownership pending"}`}
                  tone="emerald"
                />
                <QueueMetric
                  label="Inspection ID"
                  value={
                    selectedLead.inspection?.inspectionId || "Not generated"
                  }
                  helper={
                    selectedLead.inspection?.submittedAt
                      ? `Submitted ${fmt(selectedLead.inspection.submittedAt)}`
                      : "Will auto-generate on start"
                  }
                  tone="violet"
                />
              </div>
              <div className="mt-5">
                <Tabs
                  defaultActiveKey="1"
                  className="used-car-verification-tabs"
                  items={[
                    {
                      key: "1",
                      label: "Seller snapshot",
                      children: (
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              [
                                "Seller Address",
                                selectedLead.address || "Pending",
                              ],
                              [
                                "Fuel / Year",
                                `${selectedLead.fuel || "—"} · ${selectedLead.mfgYear || "—"}`,
                              ],
                              ["Color", selectedLead.color || "—"],
                              [
                                "Insurance",
                                getInsuranceDisplay(selectedLead) || "Pending",
                              ],
                              [
                                "Hypothecation",
                                selectedLead.hypothecation === true
                                  ? `Yes — ${selectedLead.bankName || "Bank pending"}`
                                  : selectedLead.hypothecation === false
                                    ? "No"
                                    : "Unknown",
                              ],
                              [
                                "Accident History",
                                selectedLead.accidentPaintHistory === true
                                  ? selectedLead.accidentPaintNotes || "Yes"
                                  : selectedLead.accidentPaintHistory === false
                                    ? "No"
                                    : "Unknown",
                              ],
                              [
                                "Expected Price",
                                fmtInrOrPending(getPrice(selectedLead)),
                              ],
                              [
                                "Mileage",
                                getMileage(selectedLead) || "Pending",
                              ],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]"
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                  {label}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "2",
                      label: "Current Status",
                      children: (
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="space-y-3">
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Outcome / Natija
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {selectedLead.inspection?.verdict ||
                                  getInspectionState(selectedLead).label}
                              </p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Remarks / Tippani
                              </p>
                              <p className="mt-1 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                                {selectedLead.inspection?.remarks ||
                                  selectedLead.notes ||
                                  "No inspection remarks recorded yet."}
                              </p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Last Movement
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                {selectedLead.activities?.[0]
                                  ? `${selectedLead.activities[0].title} — ${fmt(selectedLead.activities[0].at)}`
                                  : "No inspection movement logged yet."}
                              </p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11151b]">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                How this works / Kaise kaam karta hai
                              </p>
                              {[
                                "1. Visit Update — agar inspection nahi ho saki, reschedule karo.",
                                "2. Start Inspection — jab evaluator ready ho tab full report bharo.",
                                "3. Report mein bilingual checkpoints, dropdowns aur photos hain.",
                                "4. Passed cars aage jaati hain, No-Go cars yahan band ho jaati hain.",
                              ].map((line) => (
                                <p
                                  key={line}
                                  className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400"
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <Empty description="Koi inspection vehicle select nahi hai." />
            </div>
          )}
        </div>
      </div>

      <VisitUpdateModal
        open={visitModalOpen}
        selectedLead={selectedLead}
        visitForm={visitForm}
        onCancel={() => {
          setVisitModalOpen(false);
          visitForm.resetFields();
        }}
        onSubmit={handleVisitUpdate}
      />
    </section>
  );
}
