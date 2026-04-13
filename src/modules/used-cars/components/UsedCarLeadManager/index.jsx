import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  TimePicker,
  message,
} from "antd";
import {
  CalendarOutlined,
  CarOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import {
  CLOSURE_REASONS,
  COLUMN_PAGE_SIZE,
  INSPECTION_QUEUE_STAGE,
  LEAD_DESK_STAGE,
  LEAD_STATUS_OPTIONS,
  PIPELINE_COLUMNS,
  SAMPLE_LEADS,
  STORAGE_KEY,
} from "./constants";
import AvatarBadge from "./components/AvatarBadge";
import ActivityTimeline from "./components/ActivityTimeline";
import CallScriptPanel from "./components/CallScriptPanel";
import KanbanColumn from "./components/KanbanColumn";
import { dayjs, fmt, fmtDate, fmtInr } from "./utils/formatters";
import { useTheme } from "../../../../context/ThemeContext";
import {
  buildLeadSignature,
  firstPresent,
  genId,
  getCallScriptItems,
  getColMeta,
  getInsuranceDisplay,
  getMileage,
  getNextStatusKey,
  getPendingCallFields,
  getPrice,
  getProcurementScore,
  isDueToday,
  isOverdue,
  mkActivity,
  normInsurance,
  normMoney,
  normalizeHeaderKey,
  normalizeLeadRecord,
  normStatus,
  normText,
  pickMapped,
} from "./utils/leadUtils";

const LEAD_WINDOW_OPTIONS = ["Today", "7 Days", "15 Days", "All Leads"];
const QUEUE_FILTER_OPTIONS = [
  "All",
  "Overdue",
  "Due Today",
  "Unassigned",
  "Inspection Queue",
];

export default function UsedCarLeadManager() {
  const { isDarkMode } = useTheme();
  const [leads, setLeads] = useState(() => {
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      return r ? JSON.parse(r).map(normalizeLeadRecord) : SAMPLE_LEADS.map(normalizeLeadRecord);
    } catch {
      return SAMPLE_LEADS.map(normalizeLeadRecord);
    }
  });
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [makeFilter, setMakeFilter] = useState("All Makes");
  const [fuelFilter, setFuelFilter] = useState("All Fuel");
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [leadWindowFilter, setLeadWindowFilter] = useState("All Leads");
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState("All");
  const [columnVisibleCounts, setColumnVisibleCounts] = useState(() =>
    Object.fromEntries(PIPELINE_COLUMNS.map((col) => [col.key, COLUMN_PAGE_SIZE])),
  );
  const fileRef = useRef(null);
  const boardRef = useRef(null);
  const dragGhostRef = useRef(null);
  const [addForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [callForm] = Form.useForm();
  const [inspForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const [detailForm] = Form.useForm();
  const [dropForm] = Form.useForm();
  const [dragLeadId, setDragLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [snapState, setSnapState] = useState(null);
  const watchedCallStatus = Form.useWatch("status", callForm);
  const activeLeads = useMemo(
    () => leads.filter((lead) => normStatus(lead.status) !== "Qualified"),
    [leads],
  );
  const boardColumns = useMemo(
    () => PIPELINE_COLUMNS.filter((col) => col.key !== "Qualified"),
    [],
  );
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (!dropTarget) return;
    const targetLead = leads.find((item) => item.id === dropTarget.leadId);
    const suggestedCallbackAt =
      dropTarget.status === "Callback Scheduled" ? dayjs().add(24, "hour") : null;
    dropForm.setFieldsValue({
      status: dropTarget.status,
      note: "",
      reason: undefined,
      assignedTo: targetLead?.assignedTo || undefined,
      updatedExpectedPrice:
        targetLead?.updatedExpectedPrice || targetLead?.expectedPrice || undefined,
      nextFollowUpDate:
        dropTarget.status === "Inspection Scheduled"
          ? null
          : targetLead?.nextFollowUp
            ? dayjs(targetLead.nextFollowUp)
            : suggestedCallbackAt || dayjs(),
      nextFollowUpTime:
        dropTarget.status === "Inspection Scheduled"
          ? null
          : targetLead?.nextFollowUp
            ? dayjs(targetLead.nextFollowUp)
            : suggestedCallbackAt || dayjs().add(2, "hour"),
      date: dropTarget.status === "Inspection Scheduled" ? dayjs() : null,
      time: dropTarget.status === "Inspection Scheduled" ? dayjs().add(2, "hour") : null,
    });
  }, [dropTarget, dropForm, leads]);

  const selected = useMemo(
    () => leads.find((l) => l.id === selectedId) || null,
    [leads, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    callForm.setFieldsValue({
      status: ["Inspection Scheduled", "Closed"].includes(selected.status)
        ? "Connected"
        : selected.status,
      note: selected.notes || "",
      nextFollowUp: selected.nextFollowUp ? dayjs(selected.nextFollowUp) : null,
      followUpTime: selected.nextFollowUp ? dayjs(selected.nextFollowUp) : null,
    });
    inspForm.setFieldsValue({
      date: selected.inspectionScheduledAt
        ? dayjs(selected.inspectionScheduledAt)
        : null,
      time: selected.inspectionScheduledAt
        ? dayjs(selected.inspectionScheduledAt)
        : null,
      executive: selected.assignedTo || "",
      note: "",
    });
    closeForm.setFieldsValue({
      reason: selected.closureReason || undefined,
      note: selected.notes || "",
    });
    detailForm.setFieldsValue({
      name: selected.name,
      mobile: selected.mobile,
      address: selected.address,
      leadDate: selected.leadDate
        ? dayjs(selected.leadDate, "DD MMM YYYY")
        : null,
      leadId: selected.leadId,
      make: selected.make,
      model: selected.model,
      variant: selected.variant,
      mfgYear: selected.mfgYear,
      color: selected.color,
      mileage: getMileage(selected),
      fuel: selected.fuel,
      regNo: selected.regNo,
      ownership: selected.ownership,
      insuranceCategory: getInsuranceDisplay(selected),
      source: selected.source,
      expectedPrice: Number(selected.expectedPrice || 0),
      updatedExpectedPrice: Number(selected.updatedExpectedPrice || 0) || null,
      status: selected.status,
      assignedTo: selected.assignedTo,
      nextFollowUp: selected.nextFollowUp ? dayjs(selected.nextFollowUp) : null,
      followUpTime: selected.nextFollowUp ? dayjs(selected.nextFollowUp) : null,
      hypothecation:
        typeof selected.hypothecation === "boolean"
          ? selected.hypothecation
          : undefined,
      bankName: selected.bankName || "",
      accidentPaintHistory:
        typeof selected.accidentPaintHistory === "boolean"
          ? selected.accidentPaintHistory
          : undefined,
      accidentPaintNotes: selected.accidentPaintNotes || "",
      notes: selected.notes || "",
    });
  }, [callForm, closeForm, detailForm, inspForm, selected]);

  useEffect(() => {
    if (!selected || activeAction !== "call") return;
    if (watchedCallStatus !== "Callback Scheduled") return;
    const currentDate = callForm.getFieldValue("nextFollowUp");
    const currentTime = callForm.getFieldValue("followUpTime");
    if (currentDate && currentTime) return;
    const suggested = dayjs().add(24, "hour");
    callForm.setFieldsValue({
      nextFollowUp: currentDate || suggested,
      followUpTime: currentTime || suggested,
    });
  }, [activeAction, callForm, selected, watchedCallStatus]);

  const assignees = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(activeLeads.map((l) => normText(l.assignedTo)).filter(Boolean)),
      ).sort(),
    ],
    [activeLeads],
  );
  const sources = useMemo(
    () => [
      "All Sources",
      ...Array.from(
        new Set(activeLeads.map((l) => normText(l.source)).filter(Boolean)),
      ).sort(),
    ],
    [activeLeads],
  );
  const makes = useMemo(
    () => [
      "All Makes",
      ...Array.from(
        new Set(activeLeads.map((l) => normText(l.make)).filter(Boolean)),
      ).sort(),
    ],
    [activeLeads],
  );
  const fuels = useMemo(
    () => [
      "All Fuel",
      ...Array.from(
        new Set(activeLeads.map((l) => normText(l.fuel)).filter(Boolean)),
      ).sort(),
    ],
    [activeLeads],
  );

  const themeTokens = useMemo(
    () => ({
      pageBg: isDarkMode ? "#05070b" : "#f0f4f8",
      panelBg: isDarkMode ? "#000000" : "#ffffff",
      panelBorder: isDarkMode ? "#1f2937" : "#e2e8f0",
      panelMuted: isDarkMode ? "#0a0a0a" : "#f8fafc",
      textStrong: isDarkMode ? "#f8fafc" : "#0f172a",
      text: isDarkMode ? "#cbd5e1" : "#475569",
      textMuted: isDarkMode ? "#94a3b8" : "#94a3b8",
      soft: isDarkMode ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.04)",
      inputBg: isDarkMode ? "#0a0a0a" : "#ffffff",
      drawerBg: isDarkMode ? "#000000" : "#ffffff",
      drawerSoft: isDarkMode ? "#0a0a0a" : "#f8fafc",
      chipBg: isDarkMode ? "#0a0a0a" : "#f8fafc",
      chipBorder: isDarkMode ? "#374151" : "#e2e8f0",
      topNavBg: isDarkMode ? "rgba(0,0,0,0.94)" : "#ffffff",
      shadow: isDarkMode
        ? "0 18px 40px rgba(2,6,23,0.45)"
        : "0 18px 40px rgba(15,23,42,0.08)",
    }),
    [isDarkMode],
  );

  useEffect(() => {
    if (!snapState) return;
    const timer = window.setTimeout(() => setSnapState(null), 1100);
    return () => window.clearTimeout(timer);
  }, [snapState]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeLeads.filter((r) => {
      if (
        q &&
        !["name", "mobile", "leadId", "make", "model", "regNo", "source"]
          .map((k) => r[k])
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (assigneeFilter !== "All" && r.assignedTo !== assigneeFilter)
        return false;
      if (sourceFilter !== "All Sources" && r.source !== sourceFilter)
        return false;
      if (makeFilter !== "All Makes" && r.make !== makeFilter) return false;
      if (fuelFilter !== "All Fuel" && r.fuel !== fuelFilter) return false;
      if (quickFilter === "Overdue" && !isOverdue(r)) return false;
      if (quickFilter === "Due Today" && !isDueToday(r)) return false;
      if (quickFilter === "Unassigned" && normText(r.assignedTo)) return false;
      if (
        quickFilter === "Inspection Queue" &&
        r.pipelineStage !== INSPECTION_QUEUE_STAGE
      )
        return false;
      if (leadWindowFilter !== "All Leads") {
        const leadDate = dayjs(
          r.leadDate,
          ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"],
          true,
        );
        if (!leadDate.isValid()) return false;
        const startOfToday = dayjs().startOf("day");
        if (
          leadWindowFilter === "Today" &&
          !leadDate.isSame(startOfToday, "day")
        )
          return false;
        if (
          leadWindowFilter === "7 Days" &&
          leadDate.isBefore(dayjs().subtract(6, "day").startOf("day"))
        )
          return false;
        if (
          leadWindowFilter === "15 Days" &&
          leadDate.isBefore(dayjs().subtract(14, "day").startOf("day"))
        )
          return false;
      }
      return true;
    });
  }, [
    activeLeads,
    search,
    assigneeFilter,
    sourceFilter,
    makeFilter,
    fuelFilter,
    leadWindowFilter,
    quickFilter,
  ]);

  const columns = useMemo(
    () =>
      boardColumns.map((col) => ({
        ...col,
        leads: filtered
          .filter((r) => r.status === col.key)
          .sort((a, b) => {
            const aFollow = a.nextFollowUp ? dayjs(a.nextFollowUp).valueOf() : Number.MAX_SAFE_INTEGER;
            const bFollow = b.nextFollowUp ? dayjs(b.nextFollowUp).valueOf() : Number.MAX_SAFE_INTEGER;
            if (aFollow !== bFollow) return aFollow - bFollow;
            const scoreDiff =
              (b.procurementScore ?? getProcurementScore(b)) -
              (a.procurementScore ?? getProcurementScore(a));
            if (scoreDiff !== 0) return scoreDiff;
            const aLead = a.leadDate ? dayjs(a.leadDate, ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"]).valueOf() : 0;
            const bLead = b.leadDate ? dayjs(b.leadDate, ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"]).valueOf() : 0;
            return bLead - aLead;
          }),
      })),
    [boardColumns, filtered],
  );

  const leadWindowCounts = useMemo(() => {
    const countFor = (option) =>
      activeLeads.filter((lead) => {
        const leadDate = dayjs(
          lead.leadDate,
          ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"],
          true,
        );
        if (!leadDate.isValid()) return option === "All Leads";
        if (option === "All Leads") return true;
        if (option === "Today") return leadDate.isSame(dayjs(), "day");
        if (option === "7 Days")
          return !leadDate.isBefore(dayjs().subtract(6, "day").startOf("day"));
        if (option === "15 Days")
          return !leadDate.isBefore(dayjs().subtract(14, "day").startOf("day"));
        return true;
      }).length;
    return Object.fromEntries(LEAD_WINDOW_OPTIONS.map((option) => [option, countFor(option)]));
  }, [activeLeads]);

  const queueCounts = useMemo(
    () => ({
      All: activeLeads.length,
      Overdue: activeLeads.filter(isOverdue).length,
      "Due Today": activeLeads.filter(isDueToday).length,
      Unassigned: activeLeads.filter((lead) => !normText(lead.assignedTo)).length,
      "Inspection Queue": activeLeads.filter(
        (lead) => lead.pipelineStage === INSPECTION_QUEUE_STAGE,
      ).length,
    }),
    [activeLeads],
  );

  const missingFields = useMemo(() => {
    return getPendingCallFields(selected).map((field) => field.label);
  }, [selected]);
  const callScriptItems = useMemo(
    () => (selected ? getCallScriptItems(selected) : []),
    [selected],
  );

  const patch = (id, data, activity = null) => {
    setLeads((cur) =>
      cur.map((l) =>
        l.id !== id
          ? l
          : {
              ...l,
              ...data,
              activities: activity
                ? [activity, ...(l.activities || [])]
                : l.activities || [],
            },
      ),
    );
  };

  const openCard = (id) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setActiveAction(null);
  };

  const openQuickAdvance = (lead) => {
    const nextStatus = getNextStatusKey(lead.status);
    if (!nextStatus) return;
    setDropTarget({ leadId: lead.id, status: nextStatus });
  };

  const handleWorkNextLead = () => {
    const callableLeads = filtered.filter((lead) => normStatus(lead.status) !== "Closed");
    const nextLead =
      callableLeads.find((lead) => isOverdue(lead)) ||
      callableLeads.find((lead) => isDueToday(lead)) ||
      callableLeads
        .slice()
        .sort(
          (a, b) =>
            (b.procurementScore ?? getProcurementScore(b)) -
            (a.procurementScore ?? getProcurementScore(a)),
        )[0];
    if (!nextLead) {
      message.info("No leads available in the current queue.");
      return;
    }
    openCard(nextLead.id);
    setActiveAction("call");
  };

  const handleLoadMoreColumn = (status) => {
    setColumnVisibleCounts((current) => ({
      ...current,
      [status]: (current[status] || COLUMN_PAGE_SIZE) + COLUMN_PAGE_SIZE,
    }));
  };

  const handleDragStartCard = (event, leadId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", leadId);
    const lead = leads.find((item) => item.id === leadId);
    if (lead) {
      const ghost = document.createElement("div");
      ghost.style.position = "absolute";
      ghost.style.top = "-9999px";
      ghost.style.left = "-9999px";
      ghost.style.width = "240px";
      ghost.style.pointerEvents = "none";
      ghost.style.padding = "12px 14px";
      ghost.style.borderRadius = "16px";
      ghost.style.border = `1.5px solid ${isDarkMode ? "#334155" : "#dbe4ee"}`;
      ghost.style.background = isDarkMode ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)";
      ghost.style.boxShadow = isDarkMode
        ? "0 24px 48px rgba(2,6,23,0.48)"
        : "0 24px 48px rgba(15,23,42,0.18)";
      ghost.style.backdropFilter = "blur(10px)";
      ghost.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div style="font:700 13px -apple-system,BlinkMacSystemFont,Inter,sans-serif;color:${isDarkMode ? "#f8fafc" : "#0f172a"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lead.name || "Lead"}</div>
          <div style="font:800 10px -apple-system,BlinkMacSystemFont,Inter,sans-serif;color:#fff;background:${getColMeta(lead.status).color};padding:2px 8px;border-radius:999px;">${lead.status}</div>
        </div>
        <div style="font:600 11px -apple-system,BlinkMacSystemFont,Inter,sans-serif;color:${isDarkMode ? "#cbd5e1" : "#475569"};">${[lead.make, lead.model, lead.variant].filter(Boolean).join(" • ") || "Vehicle pending"}</div>
        <div style="font:700 12px -apple-system,BlinkMacSystemFont,Inter,sans-serif;color:${isDarkMode ? "#5eead4" : "#059669"};margin-top:8px;">${fmtInr(getPrice(lead) || 0)}</div>
      `;
      document.body.appendChild(ghost);
      dragGhostRef.current = ghost;
      event.dataTransfer.setDragImage(ghost, 24, 16);
    }
    setDragLeadId(leadId);
  };

  const handleDragEndCard = () => {
    setDragLeadId(null);
    setDragOverStatus(null);
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
  };

  const handleDragOverColumn = (event, status) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDragLeaveColumn = (status) => {
    setDragOverStatus((current) => (current === status ? null : current));
  };

  const handleDropLead = (event, status) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain") || dragLeadId;
    setDragLeadId(null);
    setDragOverStatus(null);
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
    if (!leadId) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;
    setDropTarget({ leadId, status });
  };

  const handleConfirmDropStatus = async () => {
    if (!dropTarget) return;
    try {
      const values = await dropForm.validateFields();
      const targetLead = leads.find((item) => item.id === dropTarget.leadId);
      if (!targetLead) return;
      const nextStatus = values.status || dropTarget.status;
      const patchData = {
        status: nextStatus,
      };
      if (
        !["Closed", "Inspection Scheduled"].includes(nextStatus) &&
        !normText(values.assignedTo)
      ) {
        message.error("Assign the lead owner before moving this status.");
        return;
      }
      const followUpAt =
        values.nextFollowUpDate && values.nextFollowUpTime
          ? dayjs(values.nextFollowUpDate)
              .hour(dayjs(values.nextFollowUpTime).hour())
              .minute(dayjs(values.nextFollowUpTime).minute())
              .toISOString()
          : null;
      if (
        !["Closed", "Inspection Scheduled"].includes(nextStatus) &&
        !followUpAt
      ) {
        message.error("Set the next follow-up date and time for this move.");
        return;
      }
      if (values.assignedTo) {
        patchData.assignedTo = normText(values.assignedTo);
      }
      if (values.updatedExpectedPrice !== undefined) {
        patchData.updatedExpectedPrice =
          Number(values.updatedExpectedPrice || 0) || null;
      }
      if (followUpAt) {
        patchData.nextFollowUp = followUpAt;
      }
      if (nextStatus === "Inspection Scheduled") {
        const inspectionAt = dayjs(values.date)
          .hour(dayjs(values.time).hour())
          .minute(dayjs(values.time).minute())
          .toISOString();
        patchData.pipelineStage = INSPECTION_QUEUE_STAGE;
        patchData.inspectionScheduledAt = inspectionAt;
      }
      if (nextStatus === "Closed") {
        patchData.closureReason = values.reason;
      }
      const nextLeadSnapshot = normalizeLeadRecord({
        ...targetLead,
        ...patchData,
      });
      patch(
        targetLead.id,
        nextLeadSnapshot,
        mkActivity(
          "status",
          "Status updated",
          `${targetLead.status} → ${nextStatus}${values.note ? ` • ${normText(values.note)}` : ""}${followUpAt ? ` • Follow-up ${fmt(followUpAt)}` : ""}`,
        ),
      );
      setDropTarget(null);
      dropForm.resetFields();
      setSnapState({ leadId: targetLead.id, status: nextStatus, at: Date.now() });
      message.success("Lead status updated.");
    } catch {}
  };

  const handleLogCall = async () => {
    if (!selected) return;
    try {
      const v = await callForm.validateFields();
      const suggestedFollowUp =
        v.status === "Callback Scheduled"
          ? dayjs().add(24, "hour")
          : null;
      const followUpDate = v.nextFollowUp || suggestedFollowUp;
      const followUpTime = v.followUpTime || suggestedFollowUp;
      const fu = followUpDate
        ? dayjs(followUpDate)
            .hour(dayjs(followUpTime || dayjs()).hour())
            .minute(dayjs(followUpTime || dayjs()).minute())
            .toISOString()
        : null;
      const patchData = normalizeLeadRecord({
        ...selected,
        status: normStatus(v.status),
        nextFollowUp: fu,
        notes: normText(v.note) || selected.notes,
      });
      patch(
        selected.id,
        patchData,
        mkActivity(
          "call-log",
          v.status === "Callback Scheduled"
            ? "Callback scheduled"
            : "Call updated",
          `${normText(v.note) || "Updated."}${fu ? ` • Follow-up ${fmt(fu)}` : ""}`,
        ),
      );
      setActiveAction(null);
      message.success("Call logged.");
    } catch {}
  };

  const handleScheduleInsp = async () => {
    if (!selected) return;
    try {
      const v = await inspForm.validateFields();
      const at = dayjs(v.date)
        .hour(dayjs(v.time).hour())
        .minute(dayjs(v.time).minute())
        .toISOString();
      patch(
        selected.id,
        normalizeLeadRecord({
          ...selected,
          status: "Inspection Scheduled",
          pipelineStage: INSPECTION_QUEUE_STAGE,
          inspectionScheduledAt: at,
          assignedTo: normText(v.executive) || selected.assignedTo,
          notes: normText(v.note) || selected.notes,
        }),
        mkActivity(
          "inspection",
          "Inspection scheduled",
          `${normText(v.executive)} • ${fmt(at)}`,
        ),
      );
      setActiveAction(null);
      message.success("Moved to inspection queue.");
    } catch {}
  };

  const handleCloseLead = async () => {
    if (!selected) return;
    try {
      const v = await closeForm.validateFields();
      patch(
        selected.id,
        normalizeLeadRecord({
          ...selected,
          status: "Closed",
          closureReason: v.reason,
          notes: normText(v.note) || selected.notes,
        }),
        mkActivity(
          "lead-closed",
          "Lead closed",
          `${v.reason}${v.note ? ` • ${normText(v.note)}` : ""}`,
        ),
      );
      setActiveAction(null);
      setDrawerOpen(false);
      setSelectedId(null);
      message.success("Lead closed.");
    } catch {}
  };

  const handleSaveDetails = async () => {
    if (!selected) return;
    try {
      const v = await detailForm.validateFields();
      const fu = v.nextFollowUp
        ? dayjs(v.nextFollowUp)
            .hour(dayjs(v.followUpTime || dayjs()).hour())
            .minute(dayjs(v.followUpTime || dayjs()).minute())
            .toISOString()
        : null;
      patch(
        selected.id,
        normalizeLeadRecord({
          ...selected,
          name: normText(v.name || selected.name),
          mobile: normText(v.mobile || selected.mobile),
          address: normText(v.address || selected.address),
          leadDate: v.leadDate
            ? dayjs(v.leadDate).format("DD MMM YYYY")
            : selected.leadDate,
          leadId: normText(v.leadId || selected.leadId),
          make: normText(v.make || selected.make),
          model: normText(v.model || selected.model),
          variant: normText(v.variant || selected.variant),
          mfgYear: normText(v.mfgYear || selected.mfgYear),
          color: normText(v.color || selected.color),
          mileage: normText(v.mileage || selected.mileage),
          fuel: normText(v.fuel || selected.fuel),
          regNo: normText(v.regNo || selected.regNo),
          ownership: normText(v.ownership || selected.ownership),
          insuranceCategory:
            v.insuranceCategory !== undefined
              ? v.insuranceCategory || ""
              : getInsuranceDisplay(selected),
          source: normText(v.source || selected.source),
          expectedPrice: Number(
            v.expectedPrice !== undefined ? v.expectedPrice : selected.expectedPrice || 0,
          ),
          updatedExpectedPrice:
            v.updatedExpectedPrice !== undefined
              ? Number(v.updatedExpectedPrice || 0) || null
              : selected.updatedExpectedPrice || null,
          status: normStatus(v.status || selected.status),
          assignedTo: normText(v.assignedTo || selected.assignedTo),
          nextFollowUp: fu,
          hypothecation:
            typeof v.hypothecation === "boolean"
              ? v.hypothecation
              : selected.hypothecation,
          bankName:
            v.hypothecation === true
              ? normText(v.bankName)
              : typeof v.hypothecation === "boolean"
                ? ""
                : selected.bankName,
          accidentPaintHistory:
            typeof v.accidentPaintHistory === "boolean"
              ? v.accidentPaintHistory
              : selected.accidentPaintHistory,
          accidentPaintNotes:
            typeof v.accidentPaintHistory === "boolean"
              ? v.accidentPaintHistory
                ? normText(v.accidentPaintNotes)
                : ""
              : selected.accidentPaintNotes,
          notes: normText(v.notes || selected.notes),
        }),
        mkActivity("lead-updated", "Lead updated", "Details refreshed."),
      );
      message.success("Saved.");
    } catch {}
  };

  const handleAddLead = async () => {
    try {
      const v = await addForm.validateFields();
      const lead = {
        id: genId("UL"),
        name: normText(v.name),
        mobile: normText(v.mobile),
        address: normText(v.address),
        leadDate: v.leadDate
          ? dayjs(v.leadDate).format("DD MMM YYYY")
          : fmtDate(new Date()),
        leadId: normText(v.leadId) || genId("C2B"),
        make: normText(v.make),
        model: normText(v.model),
        variant: normText(v.variant),
        mfgYear: normText(v.mfgYear),
        color: normText(v.color),
        mileage: normText(v.mileage),
        fuel: normText(v.fuel),
        regNo: normText(v.regNo),
        ownership: normText(v.ownership),
        insurance: normText(v.insurance),
        insuranceCategory: normInsurance(v.insurance),
        hypothecation: null,
        bankName: "",
        accidentPaintHistory: null,
        accidentPaintNotes: "",
        source: normText(v.source),
        expectedPrice: Number(v.expectedPrice || 0),
        updatedExpectedPrice: null,
        status: "New",
        pipelineStage: LEAD_DESK_STAGE,
        assignedTo: normText(v.assignedTo),
        nextFollowUp: null,
        inspectionScheduledAt: null,
        closureReason: "",
        notes: normText(v.notes),
        activities: [
          mkActivity("lead-created", "Lead created", "Added manually."),
        ],
      };
      setLeads((cur) => [normalizeLeadRecord(lead), ...cur]);
      setIsAddOpen(false);
      addForm.resetFields();
      openCard(lead.id);
      message.success("Lead added.");
    } catch {}
  };

  const handleBulkAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      const [from, to] = values.dateRange || [];
      const oddAssignee = normText(values.oddAssignee);
      const evenAssignee = normText(values.evenAssignee);
      const onlyUnassigned = Boolean(values.onlyUnassigned);
      if (!from || !to || !oddAssignee || !evenAssignee) return;
      let touched = 0;
      setLeads((current) =>
        current.map((lead) => {
          const leadDate = dayjs(
            lead.leadDate,
            ["DD MMM YYYY", "DD-MM-YYYY", "YYYY-MM-DD"],
            true,
          );
          const withinRange =
            leadDate.isValid() &&
            !leadDate.isBefore(dayjs(from).startOf("day")) &&
            !leadDate.isAfter(dayjs(to).endOf("day"));
          const assignable =
            withinRange &&
            (!onlyUnassigned || !normText(lead.assignedTo));
          if (!assignable) return lead;
          const dayNumber = leadDate.date();
          const assignee = dayNumber % 2 === 0 ? evenAssignee : oddAssignee;
          touched += 1;
          return {
            ...lead,
            assignedTo: assignee,
            activities: [
              mkActivity("lead-updated", "Lead assigned", `Assigned to ${assignee}`),
              ...(lead.activities || []),
            ],
          };
        }),
      );
      setIsAssignOpen(false);
      assignForm.resetFields();
      message.success(
        touched
          ? `Assigned ${touched} lead${touched > 1 ? "s" : ""} using odd/even rule.`
          : "No matching leads found for the selected date range.",
      );
    } catch {}
  };

  const handleClearLeads = () => {
    Modal.confirm({
      title: "Clear all imported and manual leads?",
      content:
        "This will empty the lead desk so you can re-import fresh data. This action only affects the browser-stored lead board.",
      okText: "Clear Leads",
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem(STORAGE_KEY);
        setLeads([]);
        setSelectedId(null);
        setDrawerOpen(false);
        setActiveAction(null);
        setLeadWindowFilter("All Leads");
        setQuickFilter("All");
        setAssigneeFilter("All");
        setSourceFilter("All Sources");
        setMakeFilter("All Makes");
        setFuelFilter("All Fuel");
        setColumnVisibleCounts(
          Object.fromEntries(PIPELINE_COLUMNS.map((col) => [col.key, COLUMN_PAGE_SIZE])),
        );
        message.success("Lead desk cleared.");
      },
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setLeadWindowFilter("All Leads");
    setQuickFilter("All");
    setAssigneeFilter("All");
    setSourceFilter("All Sources");
    setMakeFilter("All Makes");
    setFuelFilter("All Fuel");
    setColumnVisibleCounts(
      Object.fromEntries(PIPELINE_COLUMNS.map((col) => [col.key, COLUMN_PAGE_SIZE])),
    );
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      const hi = rows.findIndex(
        (r) =>
          r.map((c) => normText(c).toLowerCase()).includes("name") &&
          r.map((c) => normText(c).toLowerCase()).includes("mobile"),
      );
      if (hi === -1) {
        message.error("Could not detect header row.");
        return;
      }
      const header = rows[hi].map((c) => normText(c));
      const data = rows.slice(hi + 1).filter((r) => r.some((c) => normText(c)));
      const existingLeadIds = new Set(
        leads.map((lead) => normText(lead.leadId).toLowerCase()).filter(Boolean),
      );
      const existingSignatures = new Set(
        leads.map(buildLeadSignature).filter(Boolean),
      );
      const seenLeadIds = new Set(existingLeadIds);
      const seenSignatures = new Set(existingSignatures);
      const fresh = data
        .map((row, i) => {
          const mapped = {};
          header.forEach((k, ci) => {
            mapped[normalizeHeaderKey(k)] = row[ci];
          });
          return {
            id: genId("UL"),
            name: normText(pickMapped(mapped, ["Name"])),
            mobile: normText(pickMapped(mapped, ["Mobile"])),
            address: [
              normText(pickMapped(mapped, ["Area"])),
              normText(
                pickMapped(mapped, ["City", "Pincode City"]),
              ),
            ]
              .filter(Boolean)
              .join(", "),
            leadDate:
              normText(
                firstPresent(
                  pickMapped(mapped, ["Added Date", "Lead Date", "Status Date", "Status Updated Date"]),
                  pickMapped(mapped, ["Date", "Created Date"]),
                ),
              ) || fmtDate(new Date()),
            leadId: normText(
              pickMapped(mapped, ["C2B Lead Id", "Lead ID"]) || `IMP-${i + 1}`,
            ),
            make: normText(pickMapped(mapped, ["Make"])),
            model: normText(pickMapped(mapped, ["Model"])),
            variant: normText(pickMapped(mapped, ["Version", "Variant"])),
            mfgYear: normText(pickMapped(mapped, ["Mfg Year"])),
            color: normText(pickMapped(mapped, ["Color"])),
            mileage: normText(pickMapped(mapped, ["Mileage", "Milage"])),
            fuel: normText(pickMapped(mapped, ["Fuel"])),
            regNo: normText(pickMapped(mapped, ["Regno", "Reg No"])),
            ownership: normText(pickMapped(mapped, ["Owner", "Ownership"])),
            insurance: normText(pickMapped(mapped, ["Insurance"])),
            insuranceCategory: normInsurance(pickMapped(mapped, ["Insurance"])),
            hypothecation: null,
            bankName: "",
            accidentPaintHistory: null,
            accidentPaintNotes: "",
            source: normText(pickMapped(mapped, ["Source"])),
            expectedPrice: normMoney(
              firstPresent(
                pickMapped(mapped, ["Expected Price"]),
                pickMapped(mapped, ["Expected price", "Price Expected"]),
                pickMapped(mapped, ["Expected Amount", "Price", "Quoted Price"]),
              ),
            ),
            updatedExpectedPrice: null,
            status: normStatus(pickMapped(mapped, ["Status"])),
            pipelineStage: LEAD_DESK_STAGE,
            assignedTo: normText(pickMapped(mapped, ["Executive Name"])),
            nextFollowUp: null,
            inspectionScheduledAt: null,
            closureReason: "",
            notes: normText(pickMapped(mapped, ["Note against status"])),
            activities: [
              mkActivity(
                "lead-imported",
                "Lead imported",
                normText(pickMapped(mapped, ["Status"])) || "New",
              ),
            ],
          };
        })
        .filter((lead) => {
          const leadIdKey = normText(lead.leadId).toLowerCase();
          const sigKey = buildLeadSignature(lead);
          if ((leadIdKey && seenLeadIds.has(leadIdKey)) || (sigKey && seenSignatures.has(sigKey))) {
            return false;
          }
          if (leadIdKey) seenLeadIds.add(leadIdKey);
          if (sigKey) seenSignatures.add(sigKey);
          return true;
        });
      if (!fresh.length) {
        message.info("All leads already exist.");
        return;
      }
      setLeads((cur) => [...fresh.map(normalizeLeadRecord), ...cur]);
      message.success(
        `Imported ${fresh.length} new lead${fresh.length > 1 ? "s" : ""}.`,
      );
    } catch (e) {
      message.error(e.message || "Import failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const colMeta = selected ? getColMeta(selected.status) : null;

  return (
    <div
      ref={boardRef}
      className={`used-car-lead-manager ${isDarkMode ? "uc-dark" : "uc-light"}`}
      style={{
        minHeight: "100vh",
        background: themeTokens.pageBg,
        color: themeTokens.textStrong,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Inter",sans-serif',
      }}
    >
      <style>{`
        .used-car-lead-manager * {
          box-sizing: border-box;
        }
        .used-car-lead-manager .ant-input-affix-wrapper,
        .used-car-lead-manager .ant-picker,
        .used-car-lead-manager .ant-btn-sm {
          min-height: 32px;
        }
        .used-car-lead-manager .ant-select-single .ant-select-selector,
        .used-car-lead-manager .ant-picker,
        .used-car-lead-manager .ant-input-affix-wrapper,
        .used-car-lead-manager .ant-input-number {
          min-height: 32px !important;
          height: 32px !important;
        }
        .used-car-lead-manager .ant-form-item-control-input,
        .used-car-lead-manager .ant-form-item-control-input-content {
          min-height: 32px;
        }
        .used-car-lead-manager .ant-input-affix-wrapper,
        .used-car-lead-manager .ant-picker,
        .used-car-lead-manager .ant-select .ant-select-selector,
        .used-car-lead-manager .ant-input-number {
          display: flex;
          align-items: center;
        }
        .used-car-lead-manager .ant-input,
        .used-car-lead-manager .ant-input-affix-wrapper input,
        .used-car-lead-manager .ant-picker input,
        .used-car-lead-manager .ant-select-selection-item,
        .used-car-lead-manager .ant-select-selection-placeholder,
        .used-car-lead-manager .ant-input-number-input {
          line-height: 30px !important;
          height: 30px;
          display: flex;
          align-items: center;
        }
        .used-car-lead-manager .ant-input {
          height: 30px;
        }
        .used-car-lead-manager .ant-input-number {
          min-height: 32px;
          width: 100%;
        }
        .used-car-lead-manager .ant-input-number-input-wrap {
          height: 30px;
          display: flex;
          align-items: center;
        }
        .used-car-lead-manager .ant-select-single .ant-select-selector {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .used-car-lead-manager .ant-select-selection-search {
          inset: 0 11px !important;
        }
        .used-car-lead-manager .ant-select-selection-search-input {
          height: 30px !important;
        }
        .used-car-lead-manager .ant-input-number-input {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .used-car-lead-manager .ant-picker-input > input,
        .used-car-lead-manager .ant-input-number-input,
        .used-car-lead-manager .ant-select-selection-item,
        .used-car-lead-manager .ant-select-selection-placeholder {
          display: flex !important;
          align-items: center !important;
        }
        .used-car-lead-manager .ant-picker-input,
        .used-car-lead-manager .ant-input-affix-wrapper > input {
          display: flex;
          align-items: center;
        }
        .used-car-lead-manager .ant-input::placeholder {
          line-height: 30px !important;
        }
        .used-car-lead-manager .ant-select-selector,
        .used-car-lead-manager .ant-input-affix-wrapper,
        .used-car-lead-manager .ant-picker,
        .used-car-lead-manager .ant-input,
        .used-car-lead-manager .ant-input-number,
        .used-car-lead-manager .ant-input-number-input-wrap,
        .used-car-lead-manager .ant-input-number-input {
          background: ${themeTokens.inputBg} !important;
          color: ${themeTokens.textStrong} !important;
          border-color: ${themeTokens.panelBorder} !important;
        }
        .used-car-lead-manager .ant-select-selection-item,
        .used-car-lead-manager .ant-select-selection-placeholder,
        .used-car-lead-manager .ant-picker-input > input,
        .used-car-lead-manager .ant-input,
        .used-car-lead-manager .ant-input-number-input {
          color: ${themeTokens.textStrong} !important;
        }
        .used-car-lead-manager .ant-modal-content,
        .used-car-lead-manager .ant-drawer-content,
        .used-car-lead-manager .ant-drawer-header {
          background: ${themeTokens.drawerBg} !important;
          color: ${themeTokens.textStrong} !important;
        }
        .used-car-lead-manager .ant-modal-header {
          background: ${themeTokens.drawerBg} !important;
          border-bottom-color: ${themeTokens.panelBorder} !important;
        }
        .used-car-lead-manager .ant-modal-title,
        .used-car-lead-manager .ant-form-item-label > label,
        .used-car-lead-manager .ant-picker-suffix,
        .used-car-lead-manager .ant-select-arrow {
          color: ${themeTokens.textStrong} !important;
        }
        .used-car-lead-manager .ant-btn-default {
          background: ${themeTokens.panelMuted} !important;
          border-color: ${themeTokens.panelBorder} !important;
          color: ${themeTokens.textStrong} !important;
        }
        .used-car-lead-manager .lead-snap-in {
          animation: ucLeadSnap 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .used-car-lead-manager .column-snap-glow {
          animation: ucColumnGlow 0.7s ease-out;
        }
        @keyframes ucLeadSnap {
          0% { transform: scale(0.96) translateY(8px); box-shadow: 0 0 0 rgba(79,70,229,0); }
          55% { transform: scale(1.02) translateY(-2px); box-shadow: 0 18px 40px rgba(79,70,229,0.18); }
          100% { transform: scale(1) translateY(0); box-shadow: inherit; }
        }
        @keyframes ucColumnGlow {
          0% { box-shadow: 0 0 0 rgba(79,70,229,0); }
          40% { box-shadow: 0 0 0 4px rgba(79,70,229,0.12); }
          100% { box-shadow: 0 0 0 rgba(79,70,229,0); }
        }
      `}</style>
      {/* ===== TOP NAV ===== */}
      <div
        style={{
          background: themeTokens.topNavBg,
          borderBottom: `1px solid ${themeTokens.panelBorder}`,
          padding: "0 24px",
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CarOutlined style={{ color: "#fff", fontSize: 15 }} />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: themeTokens.textStrong,
              letterSpacing: "-0.02em",
            }}
          >
            Lead Pipeline
          </span>
          <span style={{ fontSize: 11, color: themeTokens.textMuted, fontWeight: 600 }}>
            Used Car Procurement
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button
            size="small"
            icon={<PhoneOutlined />}
            onClick={handleWorkNextLead}
            style={{ fontSize: 12 }}
          >
            Start Calling Queue
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx"
            style={{ display: "none" }}
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={() => {
              if (fileRef.current) fileRef.current.value = "";
              fileRef.current?.click();
            }}
            style={{ fontSize: 12 }}
          >
            Import
          </Button>
          <Button
            size="small"
            onClick={() => {
              assignForm.setFieldsValue({
                dateRange: null,
                oddAssignee: undefined,
                evenAssignee: undefined,
                onlyUnassigned: true,
              });
              setIsAssignOpen(true);
            }}
            style={{ fontSize: 12 }}
          >
            Assign Leads
          </Button>
          <Button
            size="small"
            danger
            onClick={handleClearLeads}
            style={{ fontSize: 12 }}
          >
            Clear Leads
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddOpen(true)}
            style={{
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none",
              fontSize: 12,
            }}
          >
            Add Lead
          </Button>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div
        style={{
          background: themeTokens.topNavBg,
          borderBottom: `1px solid ${themeTokens.panelBorder}`,
          padding: "14px 24px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
            <div
              style={{
                minWidth: 260,
                maxWidth: 360,
                flex: "1 1 280px",
              }}
            >
              <Input
                prefix={<SearchOutlined style={{ color: themeTokens.textMuted }} />}
                placeholder="Search name, mobile, registration, make or model"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{
                  width: "100%",
                  borderRadius: 24,
                  fontSize: 12,
                  border: `1px solid ${isDarkMode ? "#475569" : "#94a3b8"}`,
                  boxShadow: isDarkMode
                    ? "0 0 0 1px rgba(71,85,105,0.18)"
                    : "0 0 0 1px rgba(148,163,184,0.14)",
                }}
                size="small"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Select
                size="small"
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                style={{ minWidth: 148 }}
                options={assignees.map((value) => ({
                  value,
                  label: value === "All" ? "All Assignees" : value,
                }))}
              />
              <Select
                size="small"
                value={sourceFilter}
                onChange={setSourceFilter}
                style={{ minWidth: 140 }}
                options={sources.map((value) => ({ value, label: value }))}
              />
              <Select
                size="small"
                value={makeFilter}
                onChange={setMakeFilter}
                style={{ minWidth: 140 }}
                options={makes.map((value) => ({ value, label: value }))}
              />
              <Select
                size="small"
                value={fuelFilter}
                onChange={setFuelFilter}
                style={{ minWidth: 120 }}
                options={fuels.map((value) => ({ value, label: value }))}
              />
            </div>
          </div>
          <Button size="small" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: themeTokens.textMuted,
                minWidth: 72,
              }}
            >
              Lead Date
            </span>
            {LEAD_WINDOW_OPTIONS.map((option) => {
              const active = leadWindowFilter === option;
              return (
                <button
                  key={option}
                  onClick={() => setLeadWindowFilter(option)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 24,
                    border: active
                      ? `1px solid ${isDarkMode ? "#6366f1" : "#4f46e5"}`
                      : `1px solid ${themeTokens.chipBorder}`,
                    background: active
                      ? isDarkMode
                        ? "#111827"
                        : "#eef2ff"
                      : themeTokens.chipBg,
                    color: active
                      ? isDarkMode
                        ? "#c4b5fd"
                        : "#4338ca"
                      : themeTokens.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span>{option}</span>
                  <span
                    style={{
                      marginLeft: 6,
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: active
                        ? isDarkMode
                          ? "#4f46e5"
                          : "#4f46e5"
                        : isDarkMode
                          ? "#334155"
                          : "#e2e8f0",
                      color: active ? "#fff" : themeTokens.text,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {leadWindowCounts[option] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: themeTokens.textMuted,
                minWidth: 72,
              }}
            >
              Queue View
            </span>
            {QUEUE_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setQuickFilter(option)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 24,
                  border:
                    quickFilter === option
                      ? `1px solid ${isDarkMode ? "#38bdf8" : "#0ea5e9"}`
                      : `1px solid ${themeTokens.chipBorder}`,
                  background:
                    quickFilter === option
                      ? isDarkMode
                        ? "#082f49"
                        : "#f0f9ff"
                      : themeTokens.chipBg,
                  color:
                    quickFilter === option
                      ? isDarkMode
                        ? "#7dd3fc"
                        : "#0369a1"
                      : themeTokens.text,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>{option}</span>
                <span
                  style={{
                    marginLeft: 6,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background:
                      quickFilter === option
                        ? isDarkMode
                          ? "#0284c7"
                          : "#0ea5e9"
                        : isDarkMode
                          ? "#334155"
                          : "#e2e8f0",
                    color: quickFilter === option ? "#fff" : themeTokens.text,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {queueCounts[option] ?? 0}
                </span>
              </button>
            ))}
      </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "20px 24px",
          overflowX: "auto",
          alignItems: "flex-start",
          minHeight: "calc(100vh - 130px)",
          background: themeTokens.pageBg,
        }}
      >
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            col={col}
            leads={col.leads}
            onCardClick={openCard}
            onQuickAdvance={openQuickAdvance}
            dragOver={dragOverStatus === col.key}
            onDragOver={handleDragOverColumn}
            onDragLeave={handleDragLeaveColumn}
            onDropLead={handleDropLead}
            onDragStartCard={handleDragStartCard}
            onDragEndCard={handleDragEndCard}
            visibleCount={columnVisibleCounts[col.key] || COLUMN_PAGE_SIZE}
            onLoadMore={() => handleLoadMoreColumn(col.key)}
            isDarkMode={isDarkMode}
            themeTokens={themeTokens}
            snapActive={snapState?.status === col.key}
            snapLeadId={snapState?.status === col.key ? snapState?.leadId : null}
          />
        ))}
      </div>

      {/* ===== LEAD DETAIL DRAWER ===== */}
      <Drawer
        open={drawerOpen && Boolean(selected)}
        onClose={() => {
          setDrawerOpen(false);
          setActiveAction(null);
        }}
        destroyOnClose={false}
        width={Math.min(window.innerWidth, 760)}
        styles={{ body: { padding: 0 }, header: { display: "none" } }}
      >
        {selected && colMeta && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: `3px solid ${colMeta.color}`,
                background: isDarkMode ? "rgba(30,41,59,0.38)" : colMeta.bg,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <AvatarBadge name={selected.name} size={44} />
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 800,
                        color: themeTokens.textStrong,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {selected.name}
                    </h2>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {selected.mobile} •{" "}
                      <span style={{ fontFamily: "monospace" }}>
                        {selected.leadId}
                      </span>
                    </p>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: colMeta.color,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {selected.status}
                      </span>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: themeTokens.panelMuted,
                          color: "#475569",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {selected.source}
                      </span>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: themeTokens.panelMuted,
                          color: "#475569",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {selected.assignedTo || "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setActiveAction(null);
                  }}
                  style={{
                    background: themeTokens.panelMuted,
                    border: "none",
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Key metrics */}
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {[
                  {
                    label: "Asking Price",
                    val: fmtInr(getPrice(selected)),
                    sub: selected.updatedExpectedPrice
                      ? `Base ${fmtInr(selected.expectedPrice)}`
                      : "",
                  },
                  {
                    label: "Inspection",
                    val: selected.inspectionScheduledAt
                      ? dayjs(selected.inspectionScheduledAt).format(
                          "DD MMM, hh:mm A",
                        )
                      : "Not scheduled",
                    sub: "",
                  },
                  {
                    label: "Next Follow-up",
                    val: selected.nextFollowUp
                      ? dayjs(selected.nextFollowUp).format("DD MMM, hh:mm A")
                      : "None",
                    sub: selected.nextFollowUp
                      ? dayjs(selected.nextFollowUp).fromNow()
                      : "",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {m.label}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: 13,
                        fontWeight: 800,
                        color: themeTokens.textStrong,
                      }}
                    >
                      {m.val}
                    </p>
                    {m.sub && (
                      <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>
                        {m.sub}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {missingFields.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {missingFields.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        background: "#fff7ed",
                        color: "#c2410c",
                        borderRadius: 20,
                        border: "1px solid #fed7aa",
                        fontWeight: 600,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    key: "call",
                    label: "Log Call",
                    icon: <PhoneOutlined />,
                    color: "#6366f1",
                  },
                  {
                    key: "inspection",
                    label: "Schedule Inspection",
                    icon: <CalendarOutlined />,
                    color: "#4f46e5",
                  },
                  {
                    key: "close",
                    label: "Close Lead",
                    icon: <CloseCircleOutlined />,
                    color: "#dc2626",
                  },
                ].map((a) => (
                  <button
                    key={a.key}
                    onClick={() =>
                      setActiveAction(activeAction === a.key ? null : a.key)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1.5px solid ${activeAction === a.key ? a.color : "#e2e8f0"}`,
                      background: activeAction === a.key ? a.color : "#fff",
                      color: activeAction === a.key ? "#fff" : a.color,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <CallScriptPanel items={callScriptItems} />

              {/* Inline action forms */}
              {activeAction === "call" && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    background: "#f0f4ff",
                    borderRadius: 16,
                    border: "1.5px solid #c7d2fe",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#4f46e5",
                    }}
                  >
                    📞 Log Call Outcome
                  </p>
                  <Form form={callForm} layout="vertical" size="small">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <Form.Item
                        label="Status after call"
                        name="status"
                        rules={[{ required: true }]}
                      >
                        <Select
                          options={LEAD_STATUS_OPTIONS.filter(
                            (s) =>
                              s !== "Inspection Scheduled" && s !== "Closed",
                          ).map((v) => ({ value: v, label: v }))}
                        />
                      </Form.Item>
                      <Form.Item
                        label="Next follow-up date"
                        name="nextFollowUp"
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="DD-MM-YYYY"
                        />
                      </Form.Item>
                      <Form.Item label="Follow-up time" name="followUpTime">
                        <TimePicker
                          style={{ width: "100%" }}
                          format="hh:mm A"
                          use12Hours
                        />
                      </Form.Item>
                    </div>
                    <Form.Item
                      label="Call note"
                      name="note"
                      rules={[{ required: true }]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Outcome, objections, next steps..."
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleLogCall}
                      style={{ background: "#6366f1", borderColor: "#6366f1" }}
                    >
                      Save Call Log
                    </Button>
                  </Form>
                </div>
              )}

              {activeAction === "inspection" && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    background: "#eef2ff",
                    borderRadius: 16,
                    border: "1.5px solid #c7d2fe",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#4f46e5",
                    }}
                  >
                    📅 Schedule Inspection
                  </p>
                  <Form form={inspForm} layout="vertical" size="small">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <Form.Item
                        label="Date"
                        name="date"
                        rules={[{ required: true }]}
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="DD-MM-YYYY"
                        />
                      </Form.Item>
                      <Form.Item
                        label="Time"
                        name="time"
                        rules={[{ required: true }]}
                      >
                        <TimePicker
                          style={{ width: "100%" }}
                          format="hh:mm A"
                          use12Hours
                        />
                      </Form.Item>
                      <Form.Item
                        label="Executive"
                        name="executive"
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="Assignee name" />
                      </Form.Item>
                    </div>
                    <Form.Item label="Note" name="note">
                      <Input placeholder="Any instructions for inspector" />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleScheduleInsp}
                      style={{ background: "#4f46e5", borderColor: "#4f46e5" }}
                    >
                      Confirm Inspection
                    </Button>
                  </Form>
                </div>
              )}

              {activeAction === "close" && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    background: "#fff1f2",
                    borderRadius: 16,
                    border: "1.5px solid #fecdd3",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#e11d48",
                    }}
                  >
                    🔒 Close Lead
                  </p>
                  <Form form={closeForm} layout="vertical" size="small">
                    <Form.Item
                      label="Closure reason"
                      name="reason"
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={CLOSURE_REASONS.map((v) => ({
                          value: v,
                          label: v,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item label="Note" name="note">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Button danger size="small" onClick={handleCloseLead}>
                      Close Lead
                    </Button>
                  </Form>
                </div>
              )}

              {/* Vehicle + Call Capture details form */}
              <Form form={detailForm} layout="vertical" size="small">
                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Vehicle Details
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}
                  >
                    <Form.Item label="Make" name="make">
                      <Input placeholder="e.g. Hyundai" />
                    </Form.Item>
                    <Form.Item label="Model" name="model">
                      <Input placeholder="e.g. i20" />
                    </Form.Item>
                    <Form.Item label="Variant" name="variant">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Mfg Year" name="mfgYear">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Color" name="color">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Fuel" name="fuel">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Mileage (km)" name="mileage">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Reg No" name="regNo">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Ownership" name="ownership">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Insurance" name="insuranceCategory">
                      <Select
                        options={[
                          "Comprehensive",
                          "Zero-Dep",
                          "Third Party",
                          "Expired",
                        ].map((v) => ({ value: v, label: v }))}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Hypothecation"
                      name="hypothecation"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Yes" unCheckedChildren="No" />
                    </Form.Item>
                    <Form.Item
                      shouldUpdate={(p, c) =>
                        p.hypothecation !== c.hypothecation
                      }
                      noStyle
                    >
                      {({ getFieldValue }) =>
                        getFieldValue("hypothecation") ? (
                          <Form.Item label="Bank Name" name="bankName">
                            <Input />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                    <Form.Item
                      label="Accident / Paint History"
                      name="accidentPaintHistory"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Yes" unCheckedChildren="No" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    shouldUpdate={(p, c) =>
                      p.accidentPaintHistory !== c.accidentPaintHistory
                    }
                    noStyle
                  >
                    {({ getFieldValue }) =>
                      getFieldValue("accidentPaintHistory") ? (
                        <Form.Item
                          label="Accident / Paint Notes"
                          name="accidentPaintNotes"
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Pricing and Assignment
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}
                  >
                    <Form.Item label="Expected Price" name="expectedPrice">
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        formatter={(v) =>
                          `₹${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/[^\d.]/g, "") || ""}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Updated Expected Price"
                      name="updatedExpectedPrice"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        formatter={(v) =>
                          `₹${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v?.replace(/[^\d.]/g, "") || ""}
                      />
                    </Form.Item>
                    <Form.Item label="Assigned To" name="assignedTo">
                      <Input />
                    </Form.Item>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Seller Info
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <Form.Item
                      label="Name"
                      name="name"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label="Mobile"
                      name="mobile"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item label="Source" name="source">
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label="Address"
                      name="address"
                      style={{ gridColumn: "span 3" }}
                    >
                      <Input />
                    </Form.Item>
                  </div>
                </div>

                <Form.Item label="Notes" name="notes">
                  <Input.TextArea
                    rows={3}
                    placeholder="Context, objections, next step..."
                  />
                </Form.Item>

                <Button
                  type="primary"
                  onClick={handleSaveDetails}
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    borderColor: "#4f46e5",
                    marginBottom: 24,
                  }}
                >
                  Save Changes
                </Button>
              </Form>

              {/* Activity timeline */}
              <ActivityTimeline activities={selected.activities || []} />
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={Boolean(dropTarget)}
        onCancel={() => {
          setDropTarget(null);
          dropForm.resetFields();
        }}
        onOk={handleConfirmDropStatus}
        title={
          dropTarget?.status === "Closed"
            ? "Close Lead"
            : dropTarget?.status === "Inspection Scheduled"
              ? "Schedule Inspection"
              : "Update Lead Status"
        }
        okText={
          dropTarget?.status === "Closed"
            ? "Close Lead"
            : dropTarget?.status === "Inspection Scheduled"
              ? "Schedule Inspection"
              : "Confirm Status"
        }
        okButtonProps={{
          style: { background: "#4f46e5", borderColor: "#4f46e5" },
        }}
        width={560}
      >
        {dropTarget && (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
              {leads.find((item) => item.id === dropTarget.leadId)?.name || "Lead"}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>
              Dragged into{" "}
              <span style={{ fontWeight: 700, color: "#4f46e5" }}>
                {dropTarget.status}
              </span>
              . Confirm or refine the status update before saving.
            </p>
          </div>
        )}
        <Form form={dropForm} layout="vertical" size="small">
          {dropTarget?.status !== "Closed" && (
            <Form.Item label="Status" name="status" rules={[{ required: true }]}>
              <Select
                options={LEAD_STATUS_OPTIONS.map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
          )}
          {dropTarget?.status === "Closed" ? (
            <>
              <Form.Item
                label="Closure reason"
                name="reason"
                rules={[{ required: true }]}
              >
                <Select
                  options={CLOSURE_REASONS.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Form.Item>
              <Form.Item label="Note" name="note">
                <Input.TextArea
                  rows={3}
                  placeholder="Add context for why this lead is being closed"
                />
              </Form.Item>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Form.Item label="Assigned To" name="assignedTo">
                  <Input placeholder="Executive owner" />
                </Form.Item>
                <Form.Item
                  label="Updated Expected Price"
                  name="updatedExpectedPrice"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    formatter={(v) =>
                      `₹${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) => v?.replace(/[^\d.]/g, "") || ""}
                  />
                </Form.Item>
              </div>
              {dropTarget?.status !== "Inspection Scheduled" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <Form.Item label="Next Follow-up Date" name="nextFollowUpDate">
                    <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                  </Form.Item>
                  <Form.Item label="Next Follow-up Time" name="nextFollowUpTime">
                    <TimePicker
                      style={{ width: "100%" }}
                      format="hh:mm A"
                      use12Hours
                    />
                  </Form.Item>
                </div>
              )}
              {dropTarget?.status === "Inspection Scheduled" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <Form.Item
                    label="Inspection date"
                    name="date"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                  </Form.Item>
                  <Form.Item
                    label="Inspection time"
                    name="time"
                    rules={[{ required: true }]}
                  >
                    <TimePicker
                      style={{ width: "100%" }}
                      format="hh:mm A"
                      use12Hours
                    />
                  </Form.Item>
                </div>
              )}
              <Form.Item label="Note" name="note">
                <Input.TextArea rows={3} placeholder="Add context for this status move" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        open={isAssignOpen}
        onCancel={() => setIsAssignOpen(false)}
        onOk={handleBulkAssign}
        title={<span style={{ fontWeight: 800, fontSize: 16 }}>Assign Leads By Date</span>}
        okText="Assign Leads"
        okButtonProps={{
          style: { background: "#4f46e5", borderColor: "#4f46e5" },
        }}
        width={560}
      >
        <Form form={assignForm} layout="vertical" size="small">
          <div
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: 12,
              color: "#475569",
            }}
          >
            Odd lead dates go to one executive and even lead dates go to the other.
          </div>
          <Form.Item
            label="Lead date range"
            name="dateRange"
            rules={[{ required: true, message: "Select the lead date range." }]}
          >
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
            />
          </Form.Item>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Form.Item
              label="Odd days owner"
              name="oddAssignee"
              rules={[{ required: true, message: "Choose the odd-day owner." }]}
            >
              <Input placeholder="Executive for 1st, 3rd, 5th..." />
            </Form.Item>
            <Form.Item
              label="Even days owner"
              name="evenAssignee"
              rules={[{ required: true, message: "Choose the even-day owner." }]}
            >
              <Input placeholder="Executive for 2nd, 4th, 6th..." />
            </Form.Item>
          </div>
          <Form.Item
            label="Only unassigned leads"
            name="onlyUnassigned"
            valuePropName="checked"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== ADD LEAD MODAL ===== */}
      <Modal
        open={isAddOpen}
        onCancel={() => setIsAddOpen(false)}
        onOk={handleAddLead}
        title={
          <span style={{ fontWeight: 800, fontSize: 16 }}>Add New Lead</span>
        }
        width={760}
        okText="Create Lead"
        okButtonProps={{
          style: { background: "#6366f1", borderColor: "#6366f1" },
        }}
      >
        <Form form={addForm} layout="vertical" size="small">
          <p
            style={{
              margin: "0 0 10px",
              fontWeight: 700,
              fontSize: 11,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Seller Info
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <Form.Item label="Name" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Mobile"
              name="mobile"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Lead Date" name="leadDate">
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item label="Lead ID" name="leadId">
              <Input />
            </Form.Item>
            <Form.Item
              label="Address"
              name="address"
              style={{ gridColumn: "span 2" }}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Source" name="source">
              <Input />
            </Form.Item>
            <Form.Item label="Executive" name="assignedTo">
              <Input />
            </Form.Item>
          </div>
          <p
            style={{
              margin: "12px 0 10px",
              fontWeight: 700,
              fontSize: 11,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Vehicle
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <Form.Item label="Make" name="make">
              <Input />
            </Form.Item>
            <Form.Item label="Model" name="model">
              <Input />
            </Form.Item>
            <Form.Item label="Variant" name="variant">
              <Input />
            </Form.Item>
            <Form.Item label="Mfg Year" name="mfgYear">
              <Input />
            </Form.Item>
            <Form.Item label="Color" name="color">
              <Input />
            </Form.Item>
            <Form.Item label="Fuel" name="fuel">
              <Input />
            </Form.Item>
            <Form.Item label="Mileage" name="mileage">
              <Input />
            </Form.Item>
            <Form.Item label="Reg No" name="regNo">
              <Input />
            </Form.Item>
            <Form.Item label="Ownership" name="ownership">
              <Input />
            </Form.Item>
            <Form.Item label="Insurance" name="insurance">
              <Select
                allowClear
                options={[
                  "Comprehensive",
                  "Zero-Dep",
                  "Third Party",
                  "Expired",
                ].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
            <Form.Item label="Expected Price" name="expectedPrice">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                formatter={(v) =>
                  `₹${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(v) => v?.replace(/[^\d.]/g, "") || ""}
              />
            </Form.Item>
          </div>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
