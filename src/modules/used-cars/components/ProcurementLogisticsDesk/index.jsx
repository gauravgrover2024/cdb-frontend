import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Tag,
  Tooltip,
  message,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarClock,
  Car,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  KeyRound,
  Landmark,
  MapPin,
  PackageCheck,
  Clock,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  PROCUREMENT_STORAGE_KEY,
  MOCK_PROCUREMENT_LEADS,
  LOGISTICS_DRIVERS,
  getDefaultProcurementValues,
  PAYMENT_TYPE_OPTS,
} from "./constants";
import { DOCUMENTATION_STORAGE_KEY } from "../DocumentationDesk/constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

const FONT_VARS = {
  "--default-font-family":
    '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  "--default-mono-font-family":
    '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

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

const getChecklistItems = (ownershipType) =>
  ownershipType === "Company"
    ? [
        { label: "GST Certificate", key: "gst", icon: FileText },
        { label: "Company PAN Card", key: "panCompany", icon: FileText },
        { label: "Sale Letter", key: "saleLetter", icon: FileCheck2 },
        {
          label: "Authority Letter",
          key: "authorityLetter",
          icon: ClipboardCheck,
        },
        { label: "2 Letterheads", key: "letterheads", icon: FileText },
        { label: "RC Original", key: "rc", icon: ShieldCheck },
        { label: "Insurance Policy", key: "insurance", icon: FileText },
        { label: "2nd Key", key: "secondKey", icon: KeyRound },
        {
          label: "PAN of Signing Authority",
          key: "signingAuthorityPan",
          icon: FileText,
        },
        {
          label: "Aadhaar of Signing Authority",
          key: "signingAuthorityAadhaar",
          icon: FileText,
        },
        { label: "Service Book", key: "serviceBook", icon: FileText },
      ]
    : [
        { label: "PAN Card", key: "pan", icon: FileText },
        { label: "Sale Letter", key: "saleLetter", icon: FileCheck2 },
        { label: "RC Original", key: "rc", icon: ShieldCheck },
        { label: "Insurance Policy", key: "insurance", icon: FileText },
        { label: "2nd Key", key: "secondKey", icon: KeyRound },
        { label: "Service Book", key: "serviceBook", icon: FileText },
      ];

function getProcurementReadiness(
  values = {},
  checklistItems = [],
  finance = {},
  totalPaid = 0,
) {
  const checked = checklistItems.filter(
    (item) => values.assets?.handoffChecklist?.[item.key],
  ).length;
  const checklistReady =
    checklistItems.length > 0 && checked === checklistItems.length;
  const executiveReady = Boolean(values.logistics?.executiveId);
  const pickupReady = Boolean(values.logistics?.pickupTime);
  const docsSigned = values.logistics?.docsSigned === "Yes";
  const payoutReady =
    Math.abs(Number(totalPaid || 0) - Number(finance.net || 0)) < 1;
  const keysReady = Number(values.assets?.originalKeys || 0) > 0;
  const tyreReady = Boolean(values.assets?.spareTyreState);

  const items = [
    { key: "executive", label: "Executive assigned", ready: executiveReady },
    { key: "pickup", label: "Pickup slot fixed", ready: pickupReady },
    { key: "docs", label: "Docs signed", ready: docsSigned },
    {
      key: "checklist",
      label: "Physical docs collected",
      ready: checklistReady,
    },
    { key: "keys", label: "Keys received", ready: keysReady },
    { key: "tyre", label: "Spare tyre checked", ready: tyreReady },
    { key: "payout", label: "Payout matched", ready: payoutReady },
  ];

  const readyCount = items.filter((item) => item.ready).length;
  const percent = Math.round((readyCount / items.length) * 100);
  return {
    items,
    readyCount,
    percent,
    checked,
    checklistReady,
    payoutReady,
    docsSigned,
  };
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

function QueueCard({
  lead,
  active,
  onClick,
  readiness = 0,
  docsSigned,
  payoutMatched,
}) {
  const statusColor =
    payoutMatched && docsSigned
      ? "#10b981"
      : docsSigned
        ? "#0ea5e9"
        : "#f59e0b";

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
              {lead?.make} {lead?.model}
            </p>
            <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500">
              <MapPin size={11} /> {lead?.pickupLocation || "Pickup pending"}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
            style={{ background: `${statusColor}14`, color: statusColor }}
          >
            {readiness}%
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
            {fmtCompactMoney(lead?.finalPrice || 0)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function DeskHeader({
  selectedLead,
  docFinance,
  totalPaid,
  readiness,
  isMatched,
  formValues,
}) {
  const due = Number(docFinance.net || 0) - Number(totalPaid || 0);
  const tone =
    isMatched && formValues.logistics?.docsSigned === "Yes"
      ? "#10b981"
      : isMatched
        ? "#0ea5e9"
        : "#f59e0b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{ borderColor: "#dbe3ee" }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: tone }}
      />
      <div className="border-b border-slate-100 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em]"
                style={{ background: `${tone}12`, color: tone }}
              >
                Yard Onboarding Cockpit
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                {selectedLead?.regNo || "No Reg"}
              </span>
            </div>
            <h1 className="mt-3 truncate text-3xl font-black tracking-[-0.055em] text-slate-950">
              {[selectedLead?.make, selectedLead?.model]
                .filter(Boolean)
                .join(" ") || "Procurement Unit"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
              <span>{selectedLead?.name || "Seller"}</span>
              <span>·</span>
              <span>
                {selectedLead?.pickupLocation || "Pickup location pending"}
              </span>
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[470px]">
            <MetricCard
              icon={Activity}
              title="Readiness"
              value={`${readiness.percent}%`}
              subtitle={`${readiness.readyCount}/7 gates`}
              color="#0ea5e9"
              active={readiness.percent >= 70}
            />
            <MetricCard
              icon={WalletCards}
              title="Net Payable"
              value={fmtCompactMoney(docFinance.net)}
              subtitle="from docs"
              color="#10b981"
              active
            />
            <MetricCard
              icon={CreditCard}
              title="Paid Ledger"
              value={fmtCompactMoney(totalPaid)}
              subtitle={isMatched ? "matched" : "pending"}
              color={isMatched ? "#10b981" : "#f59e0b"}
              active
            />
            <MetricCard
              icon={AlertCircle}
              title="Balance Due"
              value={fmtCompactMoney(Math.max(0, due))}
              subtitle="to match"
              color={due <= 0 ? "#10b981" : "#ef4444"}
              active={due > 0}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4">
        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Truck size={12} /> Pickup
          </div>
          <p className="mt-2 truncate text-sm font-black text-slate-950">
            {formValues.logistics?.pickupTime
              ? dayjs(formValues.logistics.pickupTime).format(
                  "DD MMM · hh:mm A",
                )
              : "Slot pending"}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Executive {formValues.logistics?.executiveId || "not assigned"}
          </p>
        </div>

        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <FileCheck2 size={12} /> Physical Docs
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">
            {readiness.checked} collected
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Docs signed: {formValues.logistics?.docsSigned || "No"}
          </p>
        </div>

        <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <KeyRound size={12} /> Inventory
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">
            {formValues.assets?.originalKeys || 0} keys
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Spare tyre: {formValues.assets?.spareTyreState || "pending"}
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Landmark size={12} /> Finance Sync
          </div>
          <p
            className="mt-2 text-sm font-black"
            style={{ color: isMatched ? "#10b981" : "#ef4444" }}
          >
            {isMatched ? "Matched" : `Due ${fmtMoney(Math.max(0, due))}`}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Source: Documentation stage
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function Panel({
  eyebrow,
  title,
  icon: Icon,
  color = "#0ea5e9",
  action,
  children,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{ borderColor: "#dbe3ee" }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: color }}
      />
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${color}12`, color }}
          >
            <Icon size={18} />
          </div>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color }}
            >
              {eyebrow}
            </p>
            <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
              {title}
            </h3>
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </motion.div>
  );
}

function HandoffCheckboxCard({ item, checked }) {
  const Icon = item.icon;
  return (
    <div
      className="flex items-center justify-between rounded-2xl border p-3.5 transition-all"
      style={{
        borderColor: checked ? "#bbf7d0" : "#e2e8f0",
        background: checked ? "#ecfdf5" : "#f8fafc",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "#ffffff",
            color: checked ? "#10b981" : "#94a3b8",
          }}
        >
          <Icon size={16} />
        </div>
        <span className="truncate text-xs font-black text-slate-700">
          {item.label}
        </span>
      </div>
      <Checkbox />
    </div>
  );
}

function ReadinessChecklist({ items }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <Sparkles size={17} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Launch Gates
          </p>
          <h4 className="text-base font-black tracking-[-0.03em] text-slate-950">
            Onboarding readiness
          </h4>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5"
          >
            <span className="text-xs font-bold text-slate-600">
              {item.label}
            </span>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                background: item.ready ? "#dcfce7" : "#fee2e2",
                color: item.ready ? "#16a34a" : "#dc2626",
              }}
            >
              {item.ready ? (
                <CheckCircle size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProcurementLogisticsDesk() {
  const [procForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(MOCK_PROCUREMENT_LEADS[0].id);
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");

  useEffect(() => {
    const existing = document.getElementById("procurement-desk-inter-font");
    if (existing) return;

    const link = document.createElement("link");
    link.id = "procurement-desk-inter-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  const formValues =
    Form.useWatch([], procForm) || getDefaultProcurementValues();

  const selectedLead = useMemo(
    () => MOCK_PROCUREMENT_LEADS.find((lead) => lead.id === selectedId),
    [selectedId],
  );

  const docFinance = useMemo(() => {
    const saved = localStorage.getItem(
      `${DOCUMENTATION_STORAGE_KEY}_${selectedId}`,
    );
    if (saved) {
      const docs = JSON.parse(saved);
      const price = docs.vehiclePrice || selectedLead?.finalPrice || 0;
      const fees = docs.feesByUser || 0;
      const holdback = docs.holdbackAmount || 0;
      return { price, fees, holdback, net: price - fees - holdback };
    }
    const price = selectedLead?.finalPrice || 0;
    return { price, fees: 0, holdback: 0, net: price };
  }, [selectedId, selectedLead]);

  const totalPaid = useMemo(() => {
    return (formValues.payment?.records || []).reduce(
      (acc, curr) => acc + (Number(curr?.amount) || 0),
      0,
    );
  }, [formValues.payment?.records]);

  const isMatched = Math.abs(totalPaid - docFinance.net) < 1;
  const checklistItems = useMemo(
    () => getChecklistItems(selectedLead?.ownershipType),
    [selectedLead?.ownershipType],
  );
  const readiness = useMemo(
    () =>
      getProcurementReadiness(
        formValues,
        checklistItems,
        docFinance,
        totalPaid,
      ),
    [checklistItems, docFinance, formValues, totalPaid],
  );

  useEffect(() => {
    const saved = localStorage.getItem(
      `${PROCUREMENT_STORAGE_KEY}_${selectedId}`,
    );
    if (saved) {
      const parsed = JSON.parse(saved);
      procForm.setFieldsValue({
        ...getDefaultProcurementValues(),
        ...parsed,
        logistics: {
          ...parsed.logistics,
          pickupTime: parsed.logistics?.pickupTime
            ? dayjs(parsed.logistics.pickupTime)
            : null,
        },
      });
    } else {
      procForm.resetFields();
      procForm.setFieldsValue(getDefaultProcurementValues());
    }
  }, [selectedId, procForm]);

  const handleValuesChange = useCallback(
    (changed, allValues) => {
      localStorage.setItem(
        `${PROCUREMENT_STORAGE_KEY}_${selectedId}`,
        JSON.stringify(allValues),
      );
    },
    [selectedId],
  );

  const queueMeta = useMemo(() => {
    const rows = MOCK_PROCUREMENT_LEADS.map((lead) => {
      const saved = localStorage.getItem(
        `${PROCUREMENT_STORAGE_KEY}_${lead.id}`,
      );
      const values = saved ? JSON.parse(saved) : getDefaultProcurementValues();
      const savedDoc = localStorage.getItem(
        `${DOCUMENTATION_STORAGE_KEY}_${lead.id}`,
      );
      const docs = savedDoc ? JSON.parse(savedDoc) : null;
      const price = docs?.vehiclePrice || lead.finalPrice || 0;
      const fees = docs?.feesByUser || 0;
      const holdback = docs?.holdbackAmount || 0;
      const finance = { net: price - fees - holdback };
      const paid = (values.payment?.records || []).reduce(
        (acc, curr) => acc + (Number(curr?.amount) || 0),
        0,
      );
      const items = getChecklistItems(lead.ownershipType);
      const ready = getProcurementReadiness(values, items, finance, paid);
      return {
        id: lead.id,
        readiness: ready.percent,
        docsSigned: values.logistics?.docsSigned === "Yes",
        payoutMatched: Math.abs(paid - finance.net) < 1,
      };
    });
    const map = Object.fromEntries(rows.map((row) => [row.id, row]));
    return { rows, map };
  }, [selectedId, formValues]);

  const queueCounts = useMemo(() => {
    const all = MOCK_PROCUREMENT_LEADS.length;
    const ready = queueMeta.rows.filter((row) => row.readiness === 100).length;
    const pending = all - ready;
    const payout = queueMeta.rows.filter((row) => row.payoutMatched).length;
    return { all, ready, pending, payout };
  }, [queueMeta.rows]);

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase();
    return MOCK_PROCUREMENT_LEADS.filter((lead) => {
      const meta = queueMeta.map[lead.id] || {};
      if (queueFilter === "ready" && meta.readiness !== 100) return false;
      if (queueFilter === "pending" && meta.readiness === 100) return false;
      if (queueFilter === "payout" && !meta.payoutMatched) return false;
      return (
        lead.regNo?.toLowerCase().includes(s) ||
        lead.name?.toLowerCase().includes(s) ||
        lead.make?.toLowerCase().includes(s) ||
        lead.model?.toLowerCase().includes(s)
      );
    });
  }, [queueFilter, queueMeta.map, search]);

  const canOnboard = isMatched && formValues.logistics?.docsSigned === "Yes";
  const dueAmount = Number(docFinance.net || 0) - Number(totalPaid || 0);

  return (
    <div
      className="proc-shell min-h-screen rounded-3xl bg-[#f6f8fb] p-4 md:p-5"
      style={FONT_VARS}
    >
      <style>{`
        .proc-shell {
          font-family: var(--default-font-family);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: "tnum" 1, "cv05" 1, "cv08" 1;
        }
        .proc-shell .ant-form-item { margin-bottom: 0 !important; }
        .proc-shell .ant-form-item-label > label {
          font-size: 10px !important;
          font-weight: 900 !important;
          letter-spacing: 0.09em !important;
          text-transform: uppercase !important;
          color: #64748b !important;
        }
        .proc-shell .ant-input,
        .proc-shell .ant-input-number,
        .proc-shell .ant-picker,
        .proc-shell .ant-select-selector,
        .proc-shell textarea.ant-input {
          min-height: 42px !important;
          border-color: #e2e8f0 !important;
          border-radius: 14px !important;
          background: #fbfdff !important;
          box-shadow: none !important;
          font-weight: 700 !important;
        }
        .proc-shell .ant-input-number-input {
          min-height: 40px !important;
          font-weight: 800 !important;
        }
        .proc-shell .ant-input:hover,
        .proc-shell .ant-input-number:hover,
        .proc-shell .ant-picker:hover,
        .proc-shell .ant-select-selector:hover,
        .proc-shell textarea.ant-input:hover {
          border-color: #cbd5e1 !important;
          background: #ffffff !important;
        }
        .proc-shell .ant-input:focus,
        .proc-shell .ant-input-focused,
        .proc-shell .ant-input-number-focused,
        .proc-shell .ant-picker-focused,
        .proc-shell .ant-select-focused .ant-select-selector,
        .proc-shell textarea.ant-input:focus {
          border-color: #0ea5e9 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.09) !important;
        }
        .proc-shell .ant-select-selector {
          display: flex !important;
          align-items: center !important;
        }
        .proc-shell .ant-radio-button-wrapper {
          border-color: #e2e8f0 !important;
          font-weight: 800 !important;
          box-shadow: none !important;
        }
        .proc-shell .ant-radio-button-wrapper-checked {
          color: #0369a1 !important;
          border-color: #7dd3fc !important;
          background: #e0f2fe !important;
        }
        .proc-shell .ant-checkbox-wrapper {
          font-weight: 700 !important;
          color: #334155 !important;
        }
        .proc-shell ::-webkit-scrollbar { width: 5px; height: 5px; }
        .proc-shell ::-webkit-scrollbar-track { background: transparent; }
        .proc-shell ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .proc-shell ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Pipeline
                </p>
                <h2 className="mt-1 text-base font-black text-slate-950">
                  Procurement
                </h2>
              </div>
              <Tooltip title="Local procurement queue">
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
                placeholder="Search reg, seller, car..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <FilterChip
                label="All"
                count={queueCounts.all}
                active={queueFilter === "all"}
                onClick={() => setQueueFilter("all")}
                color="#6366f1"
                icon={FileText}
              />
              <FilterChip
                label="Ready"
                count={queueCounts.ready}
                active={queueFilter === "ready"}
                onClick={() => setQueueFilter("ready")}
                color="#10b981"
                icon={CheckCircle}
              />
              <FilterChip
                label="Pending"
                count={queueCounts.pending}
                active={queueFilter === "pending"}
                onClick={() => setQueueFilter("pending")}
                color="#f59e0b"
                icon={Clock}
              />
              <FilterChip
                label="Payout"
                count={queueCounts.payout}
                active={queueFilter === "payout"}
                onClick={() => setQueueFilter("payout")}
                color="#0ea5e9"
                icon={CreditCard}
              />
            </div>
          </div>

          <div className="mt-3 flex max-h-[calc(100vh-240px)] flex-col gap-2.5 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filteredLeads.map((lead) => (
                <QueueCard
                  key={lead.id}
                  lead={lead}
                  active={selectedId === lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  readiness={queueMeta.map[lead.id]?.readiness || 0}
                  docsSigned={queueMeta.map[lead.id]?.docsSigned}
                  payoutMatched={queueMeta.map[lead.id]?.payoutMatched}
                />
              ))}
            </AnimatePresence>
          </div>
        </aside>

        <main className="min-w-0">
          <Form
            form={procForm}
            layout="vertical"
            onValuesChange={handleValuesChange}
            requiredMark={false}
          >
            <DeskHeader
              selectedLead={selectedLead}
              docFinance={docFinance}
              totalPaid={totalPaid}
              readiness={readiness}
              isMatched={isMatched}
              formValues={formValues}
            />

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Panel
                  eyebrow="Logistics Command"
                  title="Pickup assignment"
                  icon={Truck}
                  color="#6366f1"
                  action={
                    <Tag className="!m-0 !rounded-full !border-0 !bg-indigo-50 !px-3 !py-1 !text-[10px] !font-black !text-indigo-700">
                      {formValues.logistics?.executiveId
                        ? "Assigned"
                        : "Unassigned"}
                    </Tag>
                  }
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <Form.Item
                      label="Assign Executive"
                      name={["logistics", "executiveId"]}
                    >
                      <Select
                        placeholder="Select executive..."
                        options={LOGISTICS_DRIVERS.map((driver) => ({
                          value: driver.id,
                          label: driver.name,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Pickup Time"
                      name={["logistics", "pickupTime"]}
                    >
                      <DatePicker
                        showTime
                        className="!w-full"
                        placeholder="Select pickup slot..."
                      />
                    </Form.Item>

                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600">
                            <ClipboardCheck size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-950">
                              Physical documents signed
                            </h4>
                            <p className="text-xs font-semibold text-slate-500">
                              Confirm ground team has executed all physical
                              agreements.
                            </p>
                          </div>
                        </div>
                        <Form.Item name={["logistics", "docsSigned"]} noStyle>
                          <Radio.Group buttonStyle="solid">
                            <Radio.Button value="Yes">Yes</Radio.Button>
                            <Radio.Button value="No">No</Radio.Button>
                          </Radio.Group>
                        </Form.Item>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel
                  eyebrow="Asset Management"
                  title="Physical handoff verification"
                  icon={PackageCheck}
                  color="#10b981"
                  action={
                    <Tag className="!m-0 !rounded-full !border-0 !bg-emerald-50 !px-3 !py-1 !text-[10px] !font-black !text-emerald-700">
                      {readiness.checked}/{checklistItems.length} collected
                    </Tag>
                  }
                >
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Core document pack
                        </p>
                        <Tag className="!m-0 !rounded-full !border-0 !bg-sky-50 !px-3 !py-1 !text-[10px] !font-black !text-sky-700">
                          {selectedLead?.ownershipType || "Individual"} case
                        </Tag>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {checklistItems.map((item) => {
                          const checked = Boolean(
                            formValues.assets?.handoffChecklist?.[item.key],
                          );
                          return (
                            <Form.Item
                              key={item.key}
                              name={["assets", "handoffChecklist", item.key]}
                              valuePropName="checked"
                              className="!mb-0"
                            >
                              <HandoffCheckboxCard
                                item={item}
                                checked={checked}
                              />
                            </Form.Item>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600">
                            <KeyRound size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Inventory spares
                            </p>
                            <h4 className="text-base font-black tracking-[-0.03em] text-slate-950">
                              Keys & tyre
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Form.Item
                            label="Original Keys Count"
                            name={["assets", "originalKeys"]}
                          >
                            <Radio.Group className="flex gap-2">
                              {[0, 1, 2].map((num) => (
                                <Radio.Button
                                  key={num}
                                  value={num}
                                  className="!flex !h-10 !w-12 !items-center !justify-center !rounded-xl !font-black"
                                >
                                  {num}
                                </Radio.Button>
                              ))}
                            </Radio.Group>
                          </Form.Item>

                          <Form.Item
                            label="Spare Tyre State"
                            name={["assets", "spareTyreState"]}
                          >
                            <Select
                              options={[
                                {
                                  value: "present",
                                  label: "Present & Balanced",
                                },
                                { value: "missing", label: "Missing" },
                                {
                                  value: "damaged",
                                  label: "Damaged / Unusable",
                                },
                              ]}
                            />
                          </Form.Item>

                          <Form.Item
                            name={["assets", "ownersManual"]}
                            valuePropName="checked"
                          >
                            <Checkbox>Owners Manual Receipt</Checkbox>
                          </Form.Item>
                        </div>
                      </div>

                      <ReadinessChecklist items={readiness.items} />
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                <Panel
                  eyebrow="Finance Sync"
                  title="Documentation payout"
                  icon={Landmark}
                  color="#0ea5e9"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        Vehicle Price
                      </span>
                      <span className="font-black text-slate-950">
                        {fmtMoney(docFinance.price)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        Deduction / Fees
                      </span>
                      <span className="font-black text-rose-500">
                        - {fmtMoney(docFinance.fees)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        Holdback Amount
                      </span>
                      <span className="font-black text-amber-500">
                        - {fmtMoney(docFinance.holdback)}
                      </span>
                    </div>
                    <Divider className="!my-2" />
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                        Net Payable
                      </span>
                      <span className="text-xl font-black tracking-[-0.04em] text-emerald-700">
                        {fmtMoney(docFinance.net)}
                      </span>
                    </div>
                  </div>
                </Panel>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-3xl border bg-white shadow-sm"
                  style={{ borderColor: "#dbe3ee" }}
                >
                  <Form.List name={["payment", "records"]}>
                    {(fields, { add, remove }) => (
                      <>
                        <div className="border-b border-slate-100 p-4 md:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <CreditCard size={18} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">
                                  Payment Engine
                                </p>
                                <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                                  Payout ledger
                                </h3>
                              </div>
                            </div>
                            <Button
                              type="text"
                              size="small"
                              icon={<Plus size={15} />}
                              className="!text-indigo-600 !font-black"
                              onClick={() =>
                                add({
                                  id: Date.now(),
                                  amount: 0,
                                  type: "Balance Payment",
                                  utn: "",
                                  date: dayjs().toISOString(),
                                })
                              }
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="max-h-[425px] space-y-3 overflow-y-auto p-4 md:p-5">
                          <AnimatePresence initial={false}>
                            {fields.map(({ key, name, ...restField }) => (
                              <motion.div
                                key={key}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                              >
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  className="absolute right-2 top-2 !flex !h-7 !w-7 !items-center !justify-center !rounded-full !p-0 opacity-50 hover:opacity-100"
                                  onClick={() => remove(name)}
                                >
                                  <Trash2 size={14} />
                                </Button>

                                <Row gutter={[12, 12]}>
                                  <Col span={14}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, "type"]}
                                      label="Type"
                                    >
                                      <Select
                                        size="small"
                                        options={PAYMENT_TYPE_OPTS}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={10}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, "amount"]}
                                      label="Amount"
                                    >
                                      <InputNumber
                                        size="small"
                                        className="!w-full"
                                        formatter={formatCurrencyInput}
                                        parser={parseCurrencyInput}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={24}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, "utn"]}
                                      label="UTN / Reference"
                                    >
                                      <Input
                                        size="small"
                                        placeholder="Ref#"
                                        className="uppercase"
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </motion.div>
                            ))}
                          </AnimatePresence>

                          {fields.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                              <CreditCard
                                className="mx-auto text-slate-300"
                                size={26}
                              />
                              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                No Payments Recorded
                              </p>
                              <Button
                                type="link"
                                onClick={() =>
                                  add({
                                    id: Date.now(),
                                    amount: 0,
                                    type: "Balance Payment",
                                    utn: "",
                                    date: dayjs().toISOString(),
                                  })
                                }
                                className="!p-0 !text-xs !font-black"
                              >
                                Record first payment
                              </Button>
                            </div>
                          )}
                        </div>

                        <div
                          className="p-5 transition-all"
                          style={{
                            background: isMatched ? "#10b981" : "#f1f5f9",
                            color: isMatched ? "#ffffff" : "#0f172a",
                          }}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-75">
                              Matched Total
                            </span>
                            <span className="text-lg font-black tracking-[-0.04em]">
                              {fmtMoney(totalPaid)}
                            </span>
                          </div>
                          {isMatched ? (
                            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.08em]">
                              <CheckCircle size={15} /> Payout Verified &
                              Completed
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black uppercase text-rose-500">
                                Due: {fmtMoney(Math.max(0, dueAmount))}
                              </span>
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Pending match
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </Form.List>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <Button
                    type="primary"
                    block
                    size="large"
                    disabled={!canOnboard}
                    className={`!h-14 !rounded-2xl !font-black !text-base shadow-lg transition-all ${
                      canOnboard
                        ? "!border-slate-950 !bg-slate-950 hover:!bg-slate-800"
                        : "!border-slate-200 !bg-slate-200 !text-slate-400"
                    }`}
                    onClick={() =>
                      message.success(
                        "Vehicle officially onboarded to ACILLP Inventory!",
                      )
                    }
                  >
                    Onboard to Yard Inventory
                  </Button>
                  <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">
                    Unlocks only after payout match and document signing.
                  </p>
                </motion.div>
              </div>
            </div>
          </Form>
        </main>
      </div>
    </div>
  );
}
