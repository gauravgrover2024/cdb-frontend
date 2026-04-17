import { apiClient } from "./client";
import { normalizeLeadRecord, normMoney, normInsurance } from "../modules/used-cars/components/UsedCarLeadManager/utils/leadUtils";
import { dayjs, fmtDate } from "../modules/used-cars/components/UsedCarLeadManager/utils/formatters";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeDateDisplay = (value) => {
  if (!value) return fmtDate(new Date());
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : String(value);
};

export const mapUsedCarLeadFromApi = (doc = {}) => {
  const seller = doc.seller || {};
  const vehicle = doc.vehicle || {};
  const pricing = doc.pricing || {};
  const workflow = doc.workflow || {};
  const assignment = doc.assignment || {};
  const scheduling = doc.scheduling || {};
  const externalRefs = doc.externalRefs || {};
  const inspection = doc.inspection || {};
  const backgroundCheck = doc.backgroundCheck || {};
  const importMeta = doc.importMeta || {};

  return normalizeLeadRecord({
    id: doc._id || doc.id,
    backendId: doc._id || doc.id,
    internalLeadId: doc.internalLeadId || "",
    leadDate: normalizeDateDisplay(doc.leadDate),
    source: doc.source || "",
    sourceStatus: doc.sourceStatus || "",
    statusDate: doc.statusDate || null,
    statusUpdatedDate: doc.statusUpdatedDate || null,
    subStatus: doc.subStatus || "",
    executiveName: doc.executiveName || "",
    leadId: externalRefs.c2bLeadId || doc.internalLeadId || "",
    c2bLeadId: externalRefs.c2bLeadId || "",
    ctiListingId: externalRefs.ctiListingId || "",
    cwListingId: externalRefs.cwListingId || "",
    pgClQleadId: externalRefs.pgClQleadId || "",
    dealerId: externalRefs.dealerId || "",
    sourceLeadId: externalRefs.sourceLeadId || "",
    name: seller.name || "",
    mobile: seller.mobile || "",
    alternateMobile: seller.alternateMobile || "",
    email: seller.email || "",
    address: seller.address || [seller.area, seller.city || seller.pincodeCity].filter(Boolean).join(", "),
    area: seller.area || "",
    pincode: seller.pincode || "",
    pincodeCity: seller.pincodeCity || "",
    city: seller.city || "",
    state: seller.state || "",
    make: vehicle.make || "",
    model: vehicle.model || "",
    variant: vehicle.variant || "",
    mfgYear: vehicle.mfgYear || "",
    mfgMonth: vehicle.mfgMonth || "",
    color: vehicle.color || "",
    mileage: vehicle.mileage ?? "",
    fuel: vehicle.fuel || "",
    regNo: vehicle.regNo || "",
    ownership: vehicle.ownership || "",
    insurance: vehicle.insurance || "",
    insuranceCategory: vehicle.insuranceCategory || normInsurance(vehicle.insurance),
    insuranceExpiry: vehicle.insuranceExpiry || "",
    hypothecation: vehicle.hypothecation,
    bankName: vehicle.bankName || "",
    accidentPaintHistory: vehicle.accidentPaintHistory,
    accidentPaintNotes: vehicle.accidentPaintNotes || "",
    expectedPrice: pricing.expectedPrice || 0,
    updatedExpectedPrice: pricing.updatedExpectedPrice ?? null,
    procurementScore: pricing.procurementScore || 0,
    scoreUpdatedAt: pricing.scoreUpdatedAt || null,
    status: workflow.status || "New",
    pipelineStage: workflow.pipelineStage || "Lead Intake",
    currentStage: workflow.currentStage || "lead-intake",
    isClosed: Boolean(workflow.isClosed),
    closureReason: workflow.closureReason || "",
    closureNotes: workflow.closureNotes || "",
    closedAt: workflow.closedAt || null,
    notes: workflow.notes || "",
    assignedTo: assignment.assignedTo || "",
    assignedAt: assignment.assignedAt || null,
    assignmentRule: assignment.assignmentRule || "",
    assignmentNotes: assignment.assignmentNotes || "",
    nextFollowUp: scheduling.nextFollowUpAt || null,
    inspectionScheduledAt: scheduling.inspectionScheduledAt || null,
    inspectionExecutiveName: scheduling.inspectionExecutiveName || "",
    inspectionExecutiveMobile: scheduling.inspectionExecutiveMobile || "",
    latestCallSummary: doc.latestCallSummary || "",
    latestDisposition: doc.latestDisposition || "",
    activities: safeArray(doc.activities).map((item) => ({
      id: item.activityId || item._id,
      activityId: item.activityId || item._id,
      type: item.type || "note",
      title: item.title || "Activity",
      detail: item.detail || "",
      at: item.at || null,
      actorName: item.actorName || "",
      meta: item.meta || {},
    })),
    callLogs: safeArray(doc.callLogs).map((item) => ({
      id: item.logId || item._id,
      logId: item.logId || item._id,
      at: item.at || null,
      status: item.status || "",
      outcome: item.outcome || "",
      notes: item.notes || "",
      durationSeconds: item.durationSeconds || 0,
      nextFollowUpAt: item.nextFollowUpAt || null,
      createdByName: item.createdByName || "",
    })),
    followUps: safeArray(doc.followUps).map((item) => ({
      id: item.followUpId || item._id,
      followUpId: item.followUpId || item._id,
      dueAt: item.dueAt || null,
      status: item.status || "",
      notes: item.notes || "",
      createdAt: item.createdAt || null,
      completedAt: item.completedAt || null,
      createdByName: item.createdByName || "",
    })),
    inspection: {
      inspectionId: inspection.inspectionId || "",
      executiveName: inspection.executiveName || scheduling.inspectionExecutiveName || "",
      executiveMobile: inspection.executiveMobile || scheduling.inspectionExecutiveMobile || "",
      conducted: inspection.conducted ?? null,
      verdict: inspection.verdict || "",
      noGoReason: inspection.noGoReason || "",
      remarks: inspection.remarks || "",
      startedAt: inspection.startedAt || null,
      submittedAt: inspection.submittedAt || null,
      inspectedAt: inspection.inspectedAt || null,
      lastOutcome: inspection.lastOutcome || "",
      rescheduledAt: inspection.rescheduledAt || null,
      rescheduleExecutiveName: inspection.rescheduleExecutiveName || "",
      rescheduleExecutiveMobile: inspection.rescheduleExecutiveMobile || "",
      reportVersion: inspection.reportVersion || "",
      report: inspection.report || {},
    },
    backgroundCheck: {
      status: backgroundCheck.status || "Pending",
      formValues: backgroundCheck.formValues || {},
      evidenceVault: safeArray(backgroundCheck.evidenceVault),
      summary: backgroundCheck.summary || {},
      notes: backgroundCheck.notes || "",
      completedAt: backgroundCheck.completedAt || null,
      updatedAt: backgroundCheck.updatedAt || null,
      auditTrail: safeArray(backgroundCheck.auditTrail),
    },
    importMeta: {
      recordSource: importMeta.recordSource || "",
      importedAt: importMeta.importedAt || null,
      importBatchId: importMeta.importBatchId || "",
      importFileName: importMeta.importFileName || "",
      importedByName: importMeta.importedByName || "",
      rawRow: importMeta.rawRow || {},
    },
    stageData: doc.stageData || {},
    rawBackend: doc,
  });
};

export const mapFlatLeadToApi = (lead = {}) => ({
  leadDate: lead.leadDate,
  source: lead.source,
  sourceStatus: lead.sourceStatus,
  statusDate: lead.statusDate,
  statusUpdatedDate: lead.statusUpdatedDate,
  subStatus: lead.subStatus,
  executiveName: lead.executiveName,
  externalRefs: {
    c2bLeadId: lead.c2bLeadId || lead.leadId,
    ctiListingId: lead.ctiListingId,
    cwListingId: lead.cwListingId,
    pgClQleadId: lead.pgClQleadId,
    dealerId: lead.dealerId,
    sourceLeadId: lead.sourceLeadId || lead.c2bLeadId || lead.leadId,
  },
  seller: {
    name: lead.name,
    mobile: lead.mobile,
    alternateMobile: lead.alternateMobile,
    email: lead.email,
    address: lead.address,
    area: lead.area,
    pincode: lead.pincode,
    pincodeCity: lead.pincodeCity,
    city: lead.city,
    state: lead.state,
  },
  vehicle: {
    make: lead.make,
    model: lead.model,
    variant: lead.variant,
    mfgYear: lead.mfgYear,
    mfgMonth: lead.mfgMonth,
    color: lead.color,
    mileage: lead.mileage,
    fuel: lead.fuel,
    regNo: lead.regNo,
    ownership: lead.ownership,
    insurance: lead.insurance,
    insuranceCategory: lead.insuranceCategory,
    insuranceExpiry: lead.insuranceExpiry,
    hypothecation: lead.hypothecation,
    bankName: lead.bankName,
    accidentPaintHistory: lead.accidentPaintHistory,
    accidentPaintNotes: lead.accidentPaintNotes,
  },
  pricing: {
    expectedPrice: normMoney(lead.expectedPrice),
    updatedExpectedPrice:
      lead.updatedExpectedPrice === undefined || lead.updatedExpectedPrice === null || lead.updatedExpectedPrice === ""
        ? null
        : normMoney(lead.updatedExpectedPrice),
    procurementScore: lead.procurementScore,
    scoreUpdatedAt: lead.scoreUpdatedAt,
  },
  workflow: {
    currentStage: lead.currentStage,
    pipelineStage: lead.pipelineStage,
    status: lead.status,
    isClosed: lead.isClosed,
    closureReason: lead.closureReason,
    closureNotes: lead.closureNotes,
    closedAt: lead.closedAt,
    notes: lead.notes,
  },
  assignment: {
    assignedTo: lead.assignedTo,
    assignedAt: lead.assignedAt,
    assignmentRule: lead.assignmentRule,
    assignmentNotes: lead.assignmentNotes,
  },
  scheduling: {
    nextFollowUpAt: lead.nextFollowUp || lead.nextFollowUpAt,
    inspectionScheduledAt: lead.inspectionScheduledAt,
    inspectionExecutiveName: lead.inspectionExecutiveName,
    inspectionExecutiveMobile: lead.inspectionExecutiveMobile,
  },
  latestCallSummary: lead.latestCallSummary,
  latestDisposition: lead.latestDisposition,
  activities: safeArray(lead.activities).map((item) => ({
    activityId: item.activityId || item.id,
    type: item.type,
    title: item.title,
    detail: item.detail,
    at: item.at,
    actorName: item.actorName,
    meta: item.meta,
  })),
  callLogs: safeArray(lead.callLogs).map((item) => ({
    logId: item.logId || item.id,
    at: item.at,
    status: item.status,
    outcome: item.outcome,
    notes: item.notes,
    durationSeconds: item.durationSeconds,
    nextFollowUpAt: item.nextFollowUpAt,
    createdByName: item.createdByName,
  })),
  followUps: safeArray(lead.followUps).map((item) => ({
    followUpId: item.followUpId || item.id,
    dueAt: item.dueAt,
    status: item.status,
    notes: item.notes,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    createdByName: item.createdByName,
  })),
  inspection: lead.inspection || {},
  backgroundCheck: lead.backgroundCheck || {},
  importMeta: lead.importMeta || {},
  stageData: lead.stageData || {},
});

const parseListResponse = (response) => ({
  ...response,
  data: safeArray(response?.data).map(mapUsedCarLeadFromApi),
});

export const usedCarsApi = {
  async listLeads(params = {}) {
    const response = await apiClient.get('/api/used-cars/leads', { params });
    return parseListResponse(response);
  },

  async getLead(id) {
    const response = await apiClient.get(`/api/used-cars/leads/${id}`);
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async createLead(lead) {
    const payload = mapFlatLeadToApi(lead);
    const response = await apiClient.post('/api/used-cars/leads', payload);
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async updateLead(id, lead) {
    const payload = mapFlatLeadToApi(lead);
    const response = await apiClient.put(`/api/used-cars/leads/${id}`, payload);
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async updateLeadPatch(id, payload) {
    const response = await apiClient.put(`/api/used-cars/leads/${id}`, payload);
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async patchWorkflow(id, payload) {
    const response = await apiClient.patch(`/api/used-cars/leads/${id}/workflow`, payload);
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async listBackgroundCheckLeads(params = {}) {
    const response = await apiClient.get('/api/used-cars/background-check/leads', {
      params,
    });
    return parseListResponse(response);
  },

  async saveBackgroundCheck(id, payload = {}) {
    const response = await apiClient.put(
      `/api/used-cars/leads/${id}/background-check`,
      payload,
    );
    return { ...response, data: mapUsedCarLeadFromApi(response?.data) };
  },

  async downloadInspectionReportPdf(id) {
    return apiClient.getBlob(`/api/used-cars/leads/${id}/inspection/report.pdf`);
  },

  async importLeads({ leads, importFileName, importBatchId, importedByName }) {
    const response = await apiClient.post('/api/used-cars/leads/import', {
      leads,
      importFileName,
      importBatchId,
      importedByName,
    });
    return {
      ...response,
      data: safeArray(response?.data).map(mapUsedCarLeadFromApi),
    };
  },

  async bulkAssign(payload) {
    return apiClient.post('/api/used-cars/leads/assign', payload);
  },

  async clearLeads(payload = { all: true }) {
    return apiClient.post('/api/used-cars/leads/clear', payload);
  },

  async deleteLead(id) {
    return apiClient.delete(`/api/used-cars/leads/${id}`);
  },
};

export const stageDataApi = {
  async save(id, stageKey, values, extra = {}) {
    return usedCarsApi.updateLeadPatch(id, {
      ...(extra || {}),
      stageData: {
        [stageKey]: values,
      },
    });
  },
};
