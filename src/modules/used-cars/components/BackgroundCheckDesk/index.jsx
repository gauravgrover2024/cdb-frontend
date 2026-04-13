import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Tabs,
  Upload,
  message,
} from "antd";
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  FileSearchOutlined,
  InboxOutlined,
  SaveOutlined,
  SearchOutlined,
  InsuranceOutlined,
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

// ── Status badge ────────────────────────────────────────────────
function BgcStatusBadge({ status }) {
  const map = {
    [BGC_STATUS.PENDING]: {
      cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
      dot: "bg-amber-400",
    },
    [BGC_STATUS.VAHAN_DONE]: {
      cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
      dot: "bg-sky-400",
    },
    [BGC_STATUS.COMPLETE]: {
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      dot: "bg-emerald-400",
    },
  };
  const { cls, dot } = map[status] || map[BGC_STATUS.PENDING];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

// ── Score pill ───────────────────────────────────────────────────
function InspectionScorePill({ score }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black"
      style={{ borderColor: color + "40", color, background: color + "12" }}
    >
      {score}% INSP
    </span>
  );
}

// ── Vahan Snapshot ───────────────────────────────────────────────
function VahanSnapshot({ values, lead }) {
  const rows = [
    { label: "Owner Name", value: values.ownerName || lead?.name || "—" },
    { label: "Ownership No.", value: values.ownershipSerialNo || lead?.ownership || "—" },
    { label: "Make / Model", value: [values.make, values.model, values.variant].filter(Boolean).join(" ") || "—" },
    { label: "Fuel Type", value: values.fuelType || lead?.fuel || "—" },
    { label: "Mfg Year", value: values.mfgYear || lead?.mfgYear || "—" },
    { label: "Regd Date", value: values.regdDate ? dayjs(values.regdDate).format("DD MMM YYYY") : "—" },
    { label: "RC Expiry", value: values.rcExpiry ? dayjs(values.rcExpiry).format("DD MMM YYYY") : "—" },
    { label: "Road Tax Expiry", value: values.roadTaxSameAsRc ? (values.rcExpiry ? dayjs(values.rcExpiry).format("DD MMM YYYY") + " (same as RC)" : "—") : values.roadTaxExpiry ? dayjs(values.roadTaxExpiry).format("DD MMM YYYY") : "—" },
    { label: "Hypothecation", value: values.hypothecation || "—", flag: values.hypothecation === "Yes" },
    { label: "Hyp. Bank", value: values.hypothecation === "Yes" ? (values.hypothecationBank || "—") : "N/A" },
    { label: "Blacklisted", value: values.blacklisted || "—", flag: values.blacklisted === "Yes" },
    { label: "Theft Record", value: values.theft || "—", flag: values.theft === "Yes" },
    { label: "Road Tax Status", value: values.roadTaxStatus || "—" },
    { label: "Challan Pending", value: values.challanPending || "—", flag: values.challanPending === "Yes" },
    { label: "RTO NOC", value: values.rtoNocIssued || "—" },
    { label: "Party Peshi", value: values.partyPeshi || "—", flag: values.partyPeshi?.includes("Applicable") },
  ];

  return (
    <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        Vahan Snapshot — Live Preview
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ label, value, flag }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
            <div className="mt-0.5 flex items-center gap-1">
              {flag === true && <ExclamationCircleFilled className="text-[10px] text-rose-500" />}
              {flag === false && <CheckCircleFilled className="text-[10px] text-emerald-500" />}
              <p className={`text-xs font-bold ${flag === true ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
      {values.vahanComments && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Comments</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">{values.vahanComments}</p>
        </div>
      )}
    </div>
  );
}

// ── Service History Snapshot ────────────────────────────────────
function ServiceSnapshot({ values }) {
  const rows = [
    { label: "Service History", value: values.serviceHistoryAvailable || "—", flag: values.serviceHistoryAvailable === "No" },
    { label: "Accident History", value: values.accidentHistory || "—", flag: values.accidentHistory && values.accidentHistory !== "None" },
    { label: "Last Service Date", value: values.lastServiceDate ? dayjs(values.lastServiceDate).format("DD MMM YYYY") : "—" },
    { label: "Last Service Km", value: values.lastServiceOdometer ? `${Number(values.lastServiceOdometer).toLocaleString("en-IN")} km` : "—" },
    { label: "Current Odometer", value: values.currentOdometer ? `${Number(values.currentOdometer).toLocaleString("en-IN")} km` : "—" },
    { label: "Odometer Status", value: values.odometerStatus || "—", flag: values.odometerStatus && values.odometerStatus !== "Not Tampered" },
    { label: "Flooded Car", value: values.floodedCar || "—", flag: values.floodedCar === "Yes" },
    { label: "Total Loss", value: values.totalLossVehicle || "—", flag: values.totalLossVehicle === "Yes" },
    { label: "Migrated Vehicle", value: values.migratedVehicle || "—", flag: values.migratedVehicle === "Yes" },
  ];

  return (
    <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        Service History Snapshot — Live Preview
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ label, value, flag }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
            <div className="mt-0.5 flex items-center gap-1">
              {flag === true && <ExclamationCircleFilled className="text-[10px] text-rose-500" />}
              {flag === false && <CheckCircleFilled className="text-[10px] text-emerald-500" />}
              <p className={`text-xs font-bold ${flag === true ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
      {values.serviceComments && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Comments</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">{values.serviceComments}</p>
        </div>
      )}
    </div>
  );
}

// ── Queue card ───────────────────────────────────────────────────
function QueueCard({ lead, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[18px] border p-3 text-left transition-all duration-150 ${
        active
          ? "border-sky-300 bg-sky-50 shadow-sm dark:border-sky-500/40 dark:bg-sky-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100">
            {lead.make} {lead.model}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {lead.variant} · {lead.mfgYear}
          </p>
          <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-700 dark:text-slate-300">
            {lead.regNo}
          </p>
        </div>
        <InspectionScorePill score={lead.inspectionScore} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {lead.assignedTo}
        </span>
        <BgcStatusBadge status={lead.bgcStatus} />
      </div>
    </button>
  );
}

// ── File upload helper ───────────────────────────────────────────
function EvidenceUpload({ label }) {
  return (
    <Dragger
      multiple={false}
      beforeUpload={() => false}
      accept="image/*,application/pdf"
      className="!rounded-[14px]"
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined className="text-slate-400" />
      </p>
      <p className="ant-upload-text text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </p>
      <p className="ant-upload-hint text-[10px] text-slate-400">
        JPG, PNG or PDF · Max 5 MB
      </p>
    </Dragger>
  );
}

// ── Main Component ───────────────────────────────────────────────
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

  // persist leads
  useEffect(() => {
    try { localStorage.setItem(BGC_STORAGE_KEY, JSON.stringify(leads)); } catch {}
  }, [leads]);

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedId), [leads, selectedId]);

  // Load form when lead changes
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
    if (activeFilter !== "All") list = list.filter((l) => l.bgcStatus === activeFilter);
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

  const handleValuesChange = useCallback((_, all) => {
    setFormValues(all);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    const vals = bgcForm.getFieldsValue(true);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? { ...l, bgcData: vals, bgcStatus: l.bgcStatus === BGC_STATUS.PENDING ? BGC_STATUS.PENDING : l.bgcStatus }
          : l,
      ),
    );
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Draft saved");
  }, [bgcForm, selectedId]);

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
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Vahan Check marked as done");
    setActiveTab("service");
  }, [bgcForm, selectedId]);

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
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    message.success("Background Check complete!");
  }, [bgcForm, selectedId]);

  const historyAvailable = formValues.serviceHistoryAvailable === "Yes";
  const hasHypothecation = formValues.hypothecation === "Yes";
  const hasChallan = formValues.challanPending === "Yes";
  const roadTaxSameAsRc = formValues.roadTaxSameAsRc;

  // ── Queue panel ────────────────────────────────────────────────
  const QueuePanel = (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Background Check Queue
        </p>
        <p className="mt-1 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Inspection-cleared cars
        </p>
        <div className="relative mt-3">
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, reg, make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BGC_QUEUE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                activeFilter === f
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 overflow-y-auto pb-4">
        {filteredLeads.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-white/10">
            No cars match this filter.
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <QueueCard
              key={lead.id}
              lead={lead}
              active={selectedId === lead.id}
              onClick={() => { setSelectedId(lead.id); setActiveTab("vahan"); }}
            />
          ))
        )}
      </div>
    </div>
  );

  // ── Vahan Check Tab ────────────────────────────────────────────
  const VahanTab = (
    <div className="space-y-4">
      <VahanSnapshot values={formValues} lead={selectedLead} />

      {/* Section: Vehicle Identity */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Vehicle Identity
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Form.Item label="Owner Name" name="ownerName" className="!mb-0">
            <Input placeholder="As per RC / Vahan" className="!rounded-xl" />
          </Form.Item>
          <Form.Item label="Ownership Serial No." name="ownershipSerialNo" className="!mb-0">
            <Select
              placeholder="Select ownership..."
              options={OWNERSHIP_SERIAL_OPTS.map((o) => ({ value: o, label: o }))}
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
      </div>

      {/* Section: Registration & Dates */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Registration & Dates
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Form.Item label="Registration Date" name="regdDate" className="!mb-0">
            <DatePicker className="!w-full !rounded-xl" format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item label="RC Expiry" name="rcExpiry" className="!mb-0">
            <DatePicker className="!w-full !rounded-xl" format="DD MMM YYYY" />
          </Form.Item>
          <div>
            <Form.Item label="Road Tax Expiry" name="roadTaxExpiry" className="!mb-1">
              <DatePicker
                className="!w-full !rounded-xl"
                format="DD MMM YYYY"
                disabled={roadTaxSameAsRc}
              />
            </Form.Item>
            <Form.Item name="roadTaxSameAsRc" valuePropName="checked" className="!mb-0">
              <Checkbox>Same as RC Expiry</Checkbox>
            </Form.Item>
          </div>
        </div>
      </div>

      {/* Section: Hypothecation */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Hypothecation
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Form.Item label="Hypothecation" name="hypothecation" className="!mb-0">
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
          {hasHypothecation && (
            <Form.Item label="Hypothecation Bank" name="hypothecationBank" className="!mb-0">
              <Input placeholder="e.g. HDFC Bank" className="!rounded-xl" />
            </Form.Item>
          )}
        </div>
      </div>

      {/* Section: Legal Status */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Legal Status
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Blacklisted */}
          <div>
            <Form.Item label="Blacklisted" name="blacklisted" className="!mb-2">
              <Radio.Group>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
              </Radio.Group>
            </Form.Item>
            {formValues.blacklisted === "Yes" && (
              <Form.Item name="blacklistedFiles" className="!mb-0">
                <EvidenceUpload label="Upload blacklist screenshot" />
              </Form.Item>
            )}
          </div>
          {/* Theft */}
          <div>
            <Form.Item label="Theft Record" name="theft" className="!mb-2">
              <Radio.Group>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
              </Radio.Group>
            </Form.Item>
            {formValues.theft === "Yes" && (
              <Form.Item name="theftFiles" className="!mb-0">
                <EvidenceUpload label="Upload theft report screenshot" />
              </Form.Item>
            )}
          </div>
          <Form.Item label="Road Tax Status" name="roadTaxStatus" className="!mb-0">
            <Select
              placeholder="Select status..."
              options={ROAD_TAX_STATUS_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
          <Form.Item label="RTO NOC Issued" name="rtoNocIssued" className="!mb-0">
            <Select
              placeholder="Select NOC status..."
              options={NOC_STATUS_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
        </div>
      </div>

      {/* Section: Challans */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Challan Status
        </p>
        <Form.Item label="Challan Pending?" name="challanPending" className="!mb-0">
          <Radio.Group>
            <Radio value="Yes">Yes</Radio>
            <Radio value="No">No</Radio>
          </Radio.Group>
        </Form.Item>

        {hasChallan && (
          <div className="mt-4 space-y-4">
            {/* eChallan */}
            <div className="rounded-[18px] border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                eChallan (Central)
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item label="Count" name="echallanCount" className="!mb-0">
                  <InputNumber min={0} placeholder="No. of challans" className="!w-full !rounded-xl" />
                </Form.Item>
                <Form.Item label="Total Amount (₹)" name="echallanAmount" className="!mb-0">
                  <InputNumber
                    min={0}
                    placeholder="0"
                    formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                    className="!w-full !rounded-xl"
                  />
                </Form.Item>
              </div>
              <div className="mt-3">
                <Form.Item name="echallanFiles" className="!mb-0">
                  <EvidenceUpload label="Upload eChallan screenshot" />
                </Form.Item>
              </div>
            </div>
            {/* Delhi Traffic Police */}
            <div className="rounded-[18px] border border-rose-100 bg-rose-50/60 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-400">
                Delhi Traffic Police
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item label="Count" name="dtpCount" className="!mb-0">
                  <InputNumber min={0} placeholder="No. of challans" className="!w-full !rounded-xl" />
                </Form.Item>
                <Form.Item label="Total Amount (₹)" name="dtpAmount" className="!mb-0">
                  <InputNumber
                    min={0}
                    placeholder="0"
                    formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                    className="!w-full !rounded-xl"
                  />
                </Form.Item>
              </div>
              <div className="mt-3">
                <Form.Item name="dtpFiles" className="!mb-0">
                  <EvidenceUpload label="Upload DTP challan screenshot" />
                </Form.Item>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section: Party Peshi & Comments */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Party Peshi & Comments
        </p>
        <div className="space-y-3">
          <Form.Item label="Party Peshi Applicability" name="partyPeshi" className="!mb-0">
            <Select
              placeholder="Select applicability..."
              options={PARTY_PESHI_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
          {formValues.partyPeshi?.includes("Applicable") && (
            <Form.Item label="Peshi Detail" name="partyPeshiDetail" className="!mb-0">
              <Input placeholder="Court / date / case detail" className="!rounded-xl" />
            </Form.Item>
          )}
          <Form.Item label="Vahan Comments" name="vahanComments" className="!mb-0">
            <TextArea
              rows={3}
              placeholder="Any remarks on the Vahan check — discrepancies, issues, observations..."
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );

  // ── Service History Tab ────────────────────────────────────────
  const ServiceTab = (
    <div className="space-y-4">
      <ServiceSnapshot values={formValues} />

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Service History
        </p>
        <div className="space-y-3">
          <Form.Item
            label="Service History Available?"
            name="serviceHistoryAvailable"
            className="!mb-0"
          >
            <Radio.Group>
              {SERVICE_HISTORY_OPTS.map((o) => (
                <Radio key={o} value={o}>{o}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {historyAvailable && (
            <>
              <Form.Item label="Any Accident History?" name="accidentHistory" className="!mb-0">
                <Select
                  placeholder="Select..."
                  options={ACCIDENT_HISTORY_OPTS.map((o) => ({ value: o, label: o }))}
                />
              </Form.Item>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item label="Last Service Date" name="lastServiceDate" className="!mb-0">
                  <DatePicker className="!w-full !rounded-xl" format="DD MMM YYYY" />
                </Form.Item>
                <Form.Item label="Last Service Odometer (km)" name="lastServiceOdometer" className="!mb-0">
                  <InputNumber
                    min={0}
                    placeholder="e.g. 45000"
                    className="!w-full !rounded-xl"
                    formatter={(v) => (v ? Number(v).toLocaleString("en-IN") : "")}
                    parser={(v) => v?.replace(/,/g, "")}
                  />
                </Form.Item>
                <Form.Item label="Current Odometer (km)" name="currentOdometer" className="!mb-0">
                  <InputNumber
                    min={0}
                    placeholder="e.g. 52000"
                    className="!w-full !rounded-xl"
                    formatter={(v) => (v ? Number(v).toLocaleString("en-IN") : "")}
                    parser={(v) => v?.replace(/,/g, "")}
                  />
                </Form.Item>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section: Vehicle History Flags */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Vehicle History Flags
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item label="Odometer Status" name="odometerStatus" className="!mb-0">
            <Select
              placeholder="Select odometer status..."
              options={ODOMETER_STATUS_OPTS.map((o) => ({ value: o, label: o }))}
            />
          </Form.Item>
          <Form.Item label="Flooded Car?" name="floodedCar" className="!mb-0">
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Total Loss Vehicle?" name="totalLossVehicle" className="!mb-0">
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Migrated Vehicle?" name="migratedVehicle" className="!mb-0">
            <Radio.Group>
              <Radio value="Yes">Yes</Radio>
              <Radio value="No">No</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11151b]">
        <Form.Item label="Service History Comments" name="serviceComments" className="!mb-0">
          <TextArea
            rows={3}
            placeholder="Any remarks about service records, odometer discrepancy, history flags..."
          />
        </Form.Item>
      </div>
    </div>
  );

  // ── No-selection state ─────────────────────────────────────────
  if (!selectedId) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
          <div>{QueuePanel}</div>
          <div className="flex items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-white/60 px-6 py-20 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                <FileSearchOutlined className="text-2xl text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a car from the queue</p>
              <p className="mt-1 text-xs text-slate-400">
                All inspection-cleared cars awaiting background verification appear here.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Detail View ────────────────────────────────────────────────
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Left — Queue */}
        <div>{QueuePanel}</div>

        {/* Right — BGC Form */}
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          {/* Car Header */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Background Check
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                {selectedLead?.make} {selectedLead?.model}{" "}
                <span className="font-light text-slate-500">·</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{selectedLead?.regNo}</span>
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <BgcStatusBadge status={selectedLead?.bgcStatus} />
                <InspectionScorePill score={selectedLead?.inspectionScore} />
                <span className="text-[10px] font-semibold text-slate-400">
                  {selectedLead?.name} · {selectedLead?.assignedTo}
                </span>
              </div>
            </div>
            <InsuranceOutlined className="text-2xl text-slate-300 dark:text-slate-600" />
          </div>

          {/* Form */}
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
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                      Vahan Check
                    </span>
                  ),
                  children: VahanTab,
                },
                {
                  key: "service",
                  label: (
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                      Service History
                    </span>
                  ),
                  children: ServiceTab,
                },
              ]}
            />

            {/* Sticky Footer */}
            <div className="sticky bottom-4 z-[90] mt-6 flex items-center justify-between rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.10)] backdrop-blur-md dark:border-white/10 dark:bg-[#090b0e]/95 lg:px-6">
              <div className="flex items-center gap-3">
                <BgcStatusBadge status={selectedLead?.bgcStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveDraft}
                  loading={saving}
                  className="!rounded-full"
                >
                  <span className="hidden sm:inline">Save Draft</span>
                  <span className="inline sm:hidden">Save</span>
                </Button>
                {activeTab === "vahan" && selectedLead?.bgcStatus === BGC_STATUS.PENDING && (
                  <Button
                    type="default"
                    onClick={handleMarkVahanDone}
                    loading={saving}
                    className="!rounded-full !border-sky-300 !text-sky-700 hover:!bg-sky-50 dark:!border-sky-500/40 dark:!text-sky-400"
                  >
                    Mark Vahan Done →
                  </Button>
                )}
                {(selectedLead?.bgcStatus === BGC_STATUS.VAHAN_DONE || activeTab === "service") && (
                  <Button
                    type="primary"
                    onClick={handleMarkComplete}
                    loading={saving}
                    className="!rounded-full !bg-emerald-600 !px-4 !font-bold dark:!bg-emerald-500 lg:!px-5"
                  >
                    Mark BGC Complete
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </div>
      </div>
    </section>
  );
}
