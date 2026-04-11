import { useMemo, useState } from "react";
import { INSPECTION_QUEUE_STAGE, PIPELINE_COLUMNS } from "../constants";
import {
  parseLeadDate,
  normText,
  isOverdue,
  isDueToday,
  getProcurementScore,
  getCallScriptItems,
  getCompleteness,
  getPendingCallFields,
  getPrice,
} from "../utils/leadUtils";
import { dayjs } from "../utils/formatters";

export default function useFilters(leads, selected) {
  const leadWindowOptions = ["Today", "7 Days", "15 Days", "All Leads"];
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [makeFilter, setMakeFilter] = useState("All Makes");
  const [fuelFilter, setFuelFilter] = useState("All Fuel");
  const [leadWindowFilter, setLeadWindowFilter] = useState("All Leads");
  const [quickFilter, setQuickFilter] = useState("All");

  const assignees = useMemo(
    () => ["All", ...Array.from(new Set(leads.map((lead) => normText(lead.assignedTo)).filter(Boolean))).sort()],
    [leads],
  );
  const sources = useMemo(
    () => ["All Sources", ...Array.from(new Set(leads.map((lead) => normText(lead.source)).filter(Boolean))).sort()],
    [leads],
  );
  const makes = useMemo(
    () => ["All Makes", ...Array.from(new Set(leads.map((lead) => normText(lead.make)).filter(Boolean))).sort()],
    [leads],
  );
  const fuels = useMemo(
    () => ["All Fuel", ...Array.from(new Set(leads.map((lead) => normText(lead.fuel)).filter(Boolean))).sort()],
    [leads],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((lead) => {
      if (
        q &&
        !["name", "mobile", "leadId", "make", "model", "regNo", "source"]
          .map((key) => lead[key])
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (assigneeFilter !== "All" && lead.assignedTo !== assigneeFilter) return false;
      if (sourceFilter !== "All Sources" && lead.source !== sourceFilter) return false;
      if (makeFilter !== "All Makes" && lead.make !== makeFilter) return false;
      if (fuelFilter !== "All Fuel" && lead.fuel !== fuelFilter) return false;
      if (quickFilter === "Overdue" && !isOverdue(lead)) return false;
      if (quickFilter === "Due Today" && !isDueToday(lead)) return false;
      if (quickFilter === "Unassigned" && normText(lead.assignedTo)) return false;
      if (quickFilter === "Inspection Queue" && lead.pipelineStage !== INSPECTION_QUEUE_STAGE) return false;
      if (leadWindowFilter !== "All Leads") {
        const leadDate = parseLeadDate(lead.leadDate);
        if (!leadDate.isValid()) return false;
        if (leadWindowFilter === "Today" && !leadDate.isSame(dayjs(), "day")) return false;
        if (leadWindowFilter === "7 Days" && leadDate.isBefore(dayjs().subtract(6, "day").startOf("day"))) return false;
        if (leadWindowFilter === "15 Days" && leadDate.isBefore(dayjs().subtract(14, "day").startOf("day"))) return false;
      }
      return true;
    });
  }, [assigneeFilter, fuelFilter, leadWindowFilter, leads, makeFilter, quickFilter, search, sourceFilter]);

  const columns = useMemo(
    () =>
      PIPELINE_COLUMNS.map((col) => ({
        ...col,
        leads: filtered
          .filter((lead) => lead.status === col.key)
          .sort((a, b) => {
            const aFollow = a.nextFollowUp ? dayjs(a.nextFollowUp).valueOf() : Number.MAX_SAFE_INTEGER;
            const bFollow = b.nextFollowUp ? dayjs(b.nextFollowUp).valueOf() : Number.MAX_SAFE_INTEGER;
            if (aFollow !== bFollow) return aFollow - bFollow;
            const scoreDiff =
              (b.procurementScore ?? getProcurementScore(b)) -
              (a.procurementScore ?? getProcurementScore(a));
            if (scoreDiff !== 0) return scoreDiff;
            const aLead = a.leadDate ? parseLeadDate(a.leadDate).valueOf() : 0;
            const bLead = b.leadDate ? parseLeadDate(b.leadDate).valueOf() : 0;
            return bLead - aLead;
          }),
      })),
    [filtered],
  );

  const leadWindowCounts = useMemo(() => {
    const countFor = (option) =>
      leads.filter((lead) => {
        const leadDate = parseLeadDate(lead.leadDate);
        if (!leadDate.isValid()) return option === "All Leads";
        if (option === "All Leads") return true;
        if (option === "Today") return leadDate.isSame(dayjs(), "day");
        if (option === "7 Days") return !leadDate.isBefore(dayjs().subtract(6, "day").startOf("day"));
        if (option === "15 Days") return !leadDate.isBefore(dayjs().subtract(14, "day").startOf("day"));
        return true;
      }).length;
    return Object.fromEntries(leadWindowOptions.map((option) => [option, countFor(option)]));
  }, [leadWindowOptions, leads]);

  const queueCounts = useMemo(
    () => ({
      All: leads.length,
      Overdue: leads.filter(isOverdue).length,
      "Due Today": leads.filter(isDueToday).length,
      Unassigned: leads.filter((lead) => !normText(lead.assignedTo)).length,
      "Inspection Queue": leads.filter((lead) => lead.pipelineStage === INSPECTION_QUEUE_STAGE).length,
    }),
    [leads],
  );

  const completeness = useMemo(() => (selected ? getCompleteness(selected) : 0), [selected]);
  const missingFields = useMemo(() => getPendingCallFields(selected).map((field) => field.label), [selected]);
  const callScriptItems = useMemo(() => (selected ? getCallScriptItems(selected) : []), [selected]);

  const todayBriefing = useMemo(() => {
    const today = dayjs();
    const activities = leads
      .flatMap((lead) =>
        (lead.activities || []).map((activity) => ({
          ...activity,
          leadName: lead.name,
          assignedTo: lead.assignedTo || "Unassigned",
        })),
      )
      .filter((activity) => dayjs(activity.at).isSame(today, "day"));
    return {
      overdue: leads.filter(isOverdue).length,
      dueToday: leads.filter(isDueToday).length,
      callsLogged: activities.filter((activity) => activity.type === "call-log").length,
      qualifiedToday: activities.filter((activity) => activity.detail?.includes("→ Qualified") || activity.title === "Connected").length,
      inspectionsToday: activities.filter((activity) => activity.type === "inspection").length,
      closedToday: activities.filter((activity) => activity.type === "lead-closed").length,
    };
  }, [leads]);

  const executiveMetrics = useMemo(() => {
    const byExec = {};
    leads.forEach((lead) => {
      const owner = normText(lead.assignedTo) || "Unassigned";
      if (!byExec[owner]) {
        byExec[owner] = {
          owner,
          assigned: 0,
          worked: 0,
          callsToday: 0,
          qualified: 0,
          inspections: 0,
          idle: 0,
          firstContactHours: [],
        };
      }
      const bucket = byExec[owner];
      bucket.assigned += 1;
      const activities = lead.activities || [];
      const callLogs = activities.filter((activity) => activity.type === "call-log");
      if (callLogs.length > 0) bucket.worked += 1;
      bucket.callsToday += callLogs.filter((activity) => dayjs(activity.at).isSame(dayjs(), "day")).length;
      if (["Qualified", "Inspection Scheduled"].includes(lead.status)) bucket.qualified += 1;
      if (lead.status === "Inspection Scheduled") bucket.inspections += 1;
      const latestActivity = activities[0]?.at;
      if (!latestActivity || dayjs(latestActivity).isBefore(dayjs().subtract(48, "hour"))) bucket.idle += 1;
      const firstCall = callLogs
        .map((activity) => dayjs(activity.at))
        .filter((date) => date.isValid())
        .sort((a, b) => a.valueOf() - b.valueOf())[0];
      const leadDate = parseLeadDate(lead.leadDate);
      if (firstCall && leadDate.isValid()) {
        bucket.firstContactHours.push(firstCall.diff(leadDate.startOf("day"), "hour", true));
      }
    });
    return Object.values(byExec)
      .map((metric) => ({
        ...metric,
        conversionRate: metric.assigned ? Math.round((metric.qualified / metric.assigned) * 100) : 0,
        avgFirstContactHours: metric.firstContactHours.length
          ? Math.round(metric.firstContactHours.reduce((sum, value) => sum + value, 0) / metric.firstContactHours.length)
          : null,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate || b.callsToday - a.callsToday);
  }, [leads]);

  const managerGrid = useMemo(
    () =>
      executiveMetrics.map((metric) => ({
        ...metric,
        stages: Object.fromEntries(
          PIPELINE_COLUMNS.map((column) => {
            const stageLeads = leads.filter(
              (lead) => (normText(lead.assignedTo) || "Unassigned") === metric.owner && lead.status === column.key,
            );
            return [
              column.key,
              { count: stageLeads.length, value: stageLeads.reduce((sum, lead) => sum + getPrice(lead), 0) },
            ];
          }),
        ),
      })),
    [executiveMetrics, leads],
  );

  const activityFeed = useMemo(
    () =>
      leads
        .flatMap((lead) =>
          (lead.activities || []).map((activity) => ({
            ...activity,
            leadName: lead.name,
            assignedTo: lead.assignedTo || "Unassigned",
          })),
        )
        .sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf())
        .slice(0, 18),
    [leads],
  );

  return {
    leadWindowOptions,
    search,
    setSearch,
    assigneeFilter,
    setAssigneeFilter,
    sourceFilter,
    setSourceFilter,
    makeFilter,
    setMakeFilter,
    fuelFilter,
    setFuelFilter,
    leadWindowFilter,
    setLeadWindowFilter,
    quickFilter,
    setQuickFilter,
    assignees,
    sources,
    makes,
    fuels,
    filtered,
    columns,
    leadWindowCounts,
    queueCounts,
    completeness,
    missingFields,
    callScriptItems,
    todayBriefing,
    executiveMetrics,
    managerGrid,
    activityFeed,
  };
}
