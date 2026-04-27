import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
  Timeline,
  message,
  Tag,
  Checkbox,
} from "antd";
import {
  SaveOutlined,
  SearchOutlined,
  DollarOutlined,
  ShopOutlined,
  HistoryOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PercentageOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  DownOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  EyeOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  NEGOTIATION_STATUS,
  getDefaultNegotiationValues,
} from "./constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";
import { usedCarsApi } from "../../../../api/usedCars";

const { TextArea } = Input;

// ══════════════════════════════════════════════════════════════════
// METRIC CARD - Redesigned with better visual hierarchy
// ══════════════════════════════════════════════════════════════════
function NegotiationMetricCard({
  title,
  value,
  subValue,
  icon,
  colorClass,
  trend,
  status,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass} shrink-0`}
        >
          {icon}
        </div>
        {(trend || status) && (
          <div className="text-right">
            {trend && (
              <div className="mb-1">
                <p
                  className={`text-xs font-black ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {trend.positive ? (
                    <ArrowUpOutlined className="text-[10px]" />
                  ) : (
                    <ArrowDownOutlined className="text-[10px]" />
                  )}{" "}
                  {trend.value}
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {trend.label}
                </p>
              </div>
            )}
            {status && (
              <Tag
                color={status.color}
                className="font-bold border-0 !rounded-full !px-2.5 !py-0.5 m-0 text-[10px]"
              >
                {status.label}
              </Tag>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          {title}
        </p>
        <p className="text-lg font-black text-slate-900 leading-tight">
          {value}
        </p>
      </div>

      {subValue && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-600">{subValue}</p>
        </div>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PREMIUM TIMELINE - Compact, elegant design
// ══════════════════════════════════════════════════════════════════
function PremiumTimeline({
  value,
  timeline,
  currentPrice,
  labelPrefix = "Offer",
}) {
  const fullTimeline = useMemo(() => {
    const history = [...(value || timeline || [])];
    const list = [];

    if (currentPrice !== undefined && currentPrice !== null) {
      list.push({
        price: currentPrice,
        timestamp: new Date().toISOString(),
        isCurrent: true,
      });
    }

    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((entry, idx) => {
      const isBaseline = idx === reversedHistory.length - 1;
      const isDuplicate =
        list.length > 1 && entry.price === list[list.length - 1].price;

      if (isBaseline || !isDuplicate) {
        list.push(entry);
      }
    });

    return list;
  }, [value, timeline, currentPrice]);

  if (fullTimeline.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <ClockCircleOutlined className="text-2xl mb-2 opacity-40" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Awaiting Initial {labelPrefix}
        </p>
      </div>
    );
  }

  return (
    <Timeline
      className="!text-xs premium-timeline !mt-2"
      items={fullTimeline.map((t, i) => ({
        children: (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative -mt-1.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`font-black tracking-tight ${
                  t.isCurrent
                    ? "text-slate-900 text-base"
                    : "text-slate-600 text-sm"
                }`}
              >
                ₹{t.price?.toLocaleString() || "0"}
              </span>
              {t.isCurrent && (
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase tracking-tight text-emerald-700 border border-emerald-200">
                  Active
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-slate-400">
              {t.isCurrent ? (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Strategy
                </span>
              ) : (
                <span>{dayjs(t.timestamp).format("DD MMM · HH:mm")}</span>
              )}
            </div>
          </motion.div>
        ),
        color: t.isCurrent ? "emerald" : "gray",
        dot: t.isCurrent ? (
          <div className="bg-emerald-500 rounded-full p-1 border-2 border-white shadow-sm shadow-emerald-500/50">
            <CheckCircleOutlined className="text-[8px] text-white" />
          </div>
        ) : (
          <div className="bg-slate-300 rounded-full w-2.5 h-2.5 border-2 border-white" />
        ),
      }))}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
// QUOTATION CARD - Modernized with better spacing
// ══════════════════════════════════════════════════════════════════
function QuotationCard({ field, remove, values, bgcForm }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const focusedLocalValueRef = React.useRef(null);
  const qData = values.quotations?.[field.name] || {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      {/* Header */}
      <div
        className={`flex cursor-pointer items-center justify-between px-5 py-4 transition-colors ${
          isCollapsed
            ? "hover:bg-slate-50"
            : "border-b-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white"
        }`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-black text-white shadow-sm">
            {field.name + 1}
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isCollapsed ? "Quotation Summary" : "Dealer Quotation Entry"}
            </p>
            {isCollapsed ? (
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-sm font-black text-slate-900 truncate max-w-[140px]">
                  {qData.dealerName || "Draft Dealer"}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-black text-emerald-600">
                  ₹{qData.quotedPrice?.toLocaleString() || "0"}
                </span>
              </div>
            ) : (
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                Live dealer quote
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isCollapsed && (qData.priceTimeline || []).length > 0 && (
            <Tag
              color="cyan"
              className="font-bold border-0 !rounded-lg m-0 text-[10px]"
            >
              +
              {(
                ((qData.quotedPrice - qData.priceTimeline[0].price) /
                  qData.priceTimeline[0].price) *
                100
              ).toFixed(1)}
              % Session Incr.
            </Tag>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                remove(field.name);
              }}
              className="hover:!bg-rose-50 !rounded-lg"
            />
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <DownOutlined className="text-xs text-slate-400" />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Form Fields */}
              <div className="lg:col-span-3 p-6 space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <Form.Item
                    {...field}
                    label="Dealer Name / Profile"
                    name={[field.name, "dealerName"]}
                    className="!mb-0"
                  >
                    <Input
                      placeholder="Dealer / evaluator name"
                      className="!rounded-xl !h-11"
                    />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    label="Sourced By"
                    name={[field.name, "sourcedBy"]}
                    className="!mb-0"
                  >
                    <Input
                      placeholder="Team member"
                      className="!rounded-xl !h-11"
                    />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    label="Contact"
                    name={[field.name, "contactNumber"]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="987..."
                      className="!rounded-xl !h-11"
                    />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    label="Location"
                    name={[field.name, "location"]}
                    className="!mb-0"
                  >
                    <Input
                      prefix={<EnvironmentOutlined />}
                      placeholder="City"
                      className="!rounded-xl !h-11"
                    />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Quoted Price (₹)</span>
                        {qData.priceTimeline?.length > 0 &&
                          qData.quotedPrice > qData.priceTimeline[0].price && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <ArrowUpOutlined className="text-[8px]" />
                              {(
                                ((qData.quotedPrice -
                                  qData.priceTimeline[0].price) /
                                  qData.priceTimeline[0].price) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          )}
                      </div>
                    }
                    name={[field.name, "quotedPrice"]}
                    className="!mb-0 md:col-span-2"
                  >
                    <InputNumber
                      className="!w-full !rounded-xl !h-12 bg-slate-50 !font-black !text-base"
                      placeholder="Enter current offer..."
                      formatter={(v) =>
                        v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
                      }
                      parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                      onFocus={() => {
                        const currentQuotes =
                          bgcForm.getFieldValue("quotations");
                        focusedLocalValueRef.current =
                          currentQuotes[field.name]?.quotedPrice;
                      }}
                      onBlur={() => {
                        const oldPrice = focusedLocalValueRef.current;
                        const currentQuotes =
                          bgcForm.getFieldValue("quotations");
                        const quote = currentQuotes[field.name];
                        const newPrice = quote.quotedPrice;

                        if (newPrice === undefined || newPrice === null) return;
                        const timeline = [...(quote.priceTimeline || [])];
                        if (timeline.length === 0) {
                          timeline.push({
                            price: oldPrice || newPrice,
                            timestamp: dayjs().toISOString(),
                            label: "Initial Quotation",
                          });
                        }

                        if (
                          oldPrice !== undefined &&
                          oldPrice !== null &&
                          oldPrice !== newPrice
                        ) {
                          const lastPrice =
                            timeline[timeline.length - 1]?.price;
                          if (lastPrice !== oldPrice) {
                            timeline.push({
                              price: oldPrice,
                              timestamp: dayjs().toISOString(),
                            });
                          }
                        }

                        quote.priceTimeline = timeline;
                        bgcForm.setFieldsValue({ quotations: currentQuotes });
                        focusedLocalValueRef.current = newPrice;
                      }}
                    />
                  </Form.Item>
                </div>
              </div>

              {/* Timeline */}
              <div className="lg:col-span-2 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Offer History
                  </p>
                  <HistoryOutlined className="text-slate-400 text-xs" />
                </div>
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar max-h-[380px]">
                  <PremiumTimeline
                    timeline={qData.priceTimeline}
                    currentPrice={qData.quotedPrice}
                    labelPrefix="Quotation"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// VAHAN SNAPSHOT - Cleaner grid layout
// ══════════════════════════════════════════════════════════════════
function formatSnapshotDate(value) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : String(value);
}

function VahanSnapshot({ lead, onOpenCertificate, openingCertificate }) {
  const vahan = lead?.backgroundCheck?.formValues || {};
  const centralChallan = Number(vahan.echallanAmount || 0);
  const stateChallan = Number(vahan.dtpAmount || 0);
  const challanAmount = centralChallan + stateChallan;
  const challanPending = vahan.challanPending || (challanAmount > 0 ? "Yes" : "No");
  const rows = [
    { label: "Owner Name", value: vahan.ownerName || lead?.name || "—" },
    { label: "Ownership No.", value: vahan.ownershipSerialNo || lead?.ownership || "—" },
    {
      label: "Make / Model",
      value:
        [vahan.make || lead?.make, vahan.model || lead?.model, vahan.variant || lead?.variant].filter(Boolean).join(" ") ||
        "—",
    },
    { label: "Fuel Type", value: vahan.fuelType || lead?.fuel || "—" },
    { label: "Mfg Year", value: vahan.mfgYear || lead?.mfgYear || "—" },
    { label: "Regd Date", value: formatSnapshotDate(vahan.regdDate), flag: false },
    { label: "RC Expiry", value: formatSnapshotDate(vahan.rcExpiry), flag: false },
    { label: "Road Tax Expiry", value: formatSnapshotDate(vahan.roadTaxExpiry), flag: false },
    {
      label: "Hypothecation",
      value: vahan.hypothecation || (lead?.hypothecation ? "Yes" : "No"),
      flag: vahan.hypothecation === "Yes" || lead?.hypothecation === true,
    },
    { label: "Blacklisted", value: vahan.blacklisted || "No", flag: vahan.blacklisted === "Yes" },
    { label: "Theft Record", value: vahan.theft || "No", flag: vahan.theft === "Yes" },
    {
      label: "Challan Pending",
      value: `${challanPending}${challanAmount ? ` · ₹${challanAmount.toLocaleString("en-IN")}` : ""}`,
      flag: challanPending === "Yes",
    },
    { label: "RTO NOC", value: vahan.rtoNocIssued || "Not Issued", flag: vahan.rtoNocIssued?.includes("Pending") },
  ];

  return (
    <div className="mb-5 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
        <EyeOutlined className="text-xs" />
        Vahan Snapshot — Desk Reference
      </p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ label, value, flag }) => (
          <div key={label} className="space-y-1">
            <p className="text-[10px] text-slate-500 font-medium">{label}</p>
            <div className="flex items-center gap-1.5">
              {flag === true ? (
                <ExclamationCircleFilled className="text-xs text-rose-500" />
              ) : (
                <CheckCircleFilled className="text-xs text-emerald-500" />
              )}
              <p
                className={`text-xs font-bold ${
                  flag === true ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {value}
              </p>
              {label === "Challan Pending" && (
                <EyeOutlined className="text-xs text-sky-500 cursor-pointer ml-auto" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t-2 border-slate-100 pt-4 flex items-center justify-between">
        <Tag className="!rounded-lg border-0 bg-emerald-50 text-emerald-700 m-0 text-[10px] font-bold px-3 py-1">
          <CheckCircleFilled className="mr-1" />
          Inspection Verified
        </Tag>
        <Button
          type="link"
          icon={<EyeOutlined />}
          loading={openingCertificate}
          className="!p-0 !h-auto text-sky-600 hover:text-sky-700 text-xs font-bold"
          onClick={onOpenCertificate}
        >
          View Certificate
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// QUEUE CARD - Enhanced with better hover states
// ══════════════════════════════════════════════════════════════════
function QueueCard({ lead, active, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: active ? 1 : 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all ${
        active
          ? "border-slate-900 bg-slate-950 text-white shadow-lg scale-[1.02]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${
              active ? "text-white/50" : "text-slate-400"
            }`}
          >
            {lead.regNo}
          </p>
          <p className="text-sm font-black leading-tight truncate">
            {lead.make} {lead.model} {lead.variant}
          </p>
          <p
            className={`mt-1 text-[11px] font-bold ${
              active ? "text-white/60" : "text-slate-500"
            }`}
          >
            {lead.mfgYear} · {lead.name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight mb-2 ${
              active
                ? "bg-white/10"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {lead.bgcStatus}
          </div>
          <p className="text-xs font-black">
            ₹{(Number(lead.customerDemand || 0) / 100000).toFixed(2)}L
          </p>
        </div>
      </div>
      {(lead.tags || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lead.tags.map((t) => (
            <span
              key={t}
              className={`px-2 py-1 rounded-md text-[9px] font-bold ${
                active ? "bg-white/10" : "bg-slate-100 text-slate-600"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {active && (
        <motion.div
          className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function UsedCarNegotiationDesk() {
  const [negForm] = Form.useForm();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingCertificate, setOpeningCertificate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [isSellerHubCollapsed, setIsSellerHubCollapsed] = useState(false);
  const focusedValueRef = React.useRef(null);

  const mapLeadForQueue = useCallback((lead = {}) => ({
    ...lead,
    id: lead.id || lead.backendId,
    bgcStatus: lead.backgroundCheck?.status || "BGC Complete",
    customerDemand:
      lead.negotiation?.customer?.demand ||
      lead.stageData?.negotiation?.customerDemand ||
      lead.updatedExpectedPrice ||
      lead.expectedPrice ||
      0,
    inspectionScore:
      Number(
        lead.inspection?.report?.overallScore ||
          lead.inspection?.report?.score ||
          lead.procurementScore ||
          0,
      ) || 0,
  }), []);

  const fetchNegotiationLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usedCarsApi.listNegotiationLeads({ limit: 500 });
      const rows = (res.data || []).map(mapLeadForQueue);
      setLeads(rows);
      setSelectedId((current) => current || rows[0]?.id || null);
    } catch (error) {
      message.error(error?.message || "Negotiation leads load nahi ho paye.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [mapLeadForQueue]);

  useEffect(() => {
    fetchNegotiationLeads();
  }, [fetchNegotiationLeads]);

  const recordNegotiationStep = useCallback(
    (newPrice, oldPrice, timelinePath, baselineLabel) => {
      if (newPrice === undefined || newPrice === null) return;

      let currentTimeline = [...(negForm.getFieldValue(timelinePath) || [])];

      if (currentTimeline.length === 0) {
        currentTimeline = [
          {
            price: oldPrice || newPrice,
            timestamp: dayjs().toISOString(),
            label: baselineLabel,
          },
        ];
      }

      if (
        oldPrice !== undefined &&
        oldPrice !== null &&
        oldPrice !== newPrice
      ) {
        const lastEntry = currentTimeline[currentTimeline.length - 1];
        if (!lastEntry || lastEntry.price !== oldPrice) {
          currentTimeline.push({
            price: oldPrice,
            timestamp: dayjs().toISOString(),
            label: currentTimeline.length === 0 ? baselineLabel : undefined,
          });
        }
      }

      negForm.setFieldValue(timelinePath, currentTimeline);
    },
    [negForm],
  );

  const formValues =
    Form.useWatch([], negForm) || getDefaultNegotiationValues();

  const timelineStyles = (
    <style>
      {`
        .premium-timeline .ant-timeline-item-tail {
          border-inline-start: 2px solid #e2e8f0 !important;
          left: 5px !important;
        }
        .premium-timeline .ant-timeline-item-head {
          background: transparent !important;
          left: 5px !important;
        }
        .premium-timeline .ant-timeline-item-content {
          margin-inline-start: 28px !important;
          padding-bottom: 18px !important;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}
    </style>
  );

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId),
    [leads, selectedId],
  );

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.regNo?.toLowerCase().includes(s) ||
        l.name?.toLowerCase().includes(s) ||
        l.model?.toLowerCase().includes(s) ||
        l.negotiation?.summary?.bestDealerName?.toLowerCase().includes(s),
    );
  }, [leads, search]);

  const getLeadNegotiationValues = useCallback((lead = {}) => {
    const defaults = getDefaultNegotiationValues();
    const negotiation = lead.negotiation || {};
    const customer = negotiation.customer || {};
    const legacy = lead.stageData?.negotiation || {};
    const demand =
      customer.demand ||
      legacy.customerDemand ||
      lead.updatedExpectedPrice ||
      lead.expectedPrice ||
      null;

    return {
      ...defaults,
      customerDemand: demand,
      targetPrice: customer.targetPrice || legacy.targetPrice || null,
      customerNegotiation: {
        ...(legacy.customerNegotiation || {}),
        ...customer,
        priceTimeline:
          customer.priceTimeline ||
          legacy.customerNegotiation?.priceTimeline ||
          (demand
            ? [
                {
                  price: demand,
                  timestamp: dayjs().toISOString(),
                  label: "Original Demand",
                },
              ]
            : []),
      },
      quotations:
        (negotiation.dealerQuotes?.length
          ? negotiation.dealerQuotes
          : legacy.quotations) || defaults.quotations,
      negotiationStatus:
        negotiation.status || legacy.negotiationStatus || defaults.negotiationStatus,
      comments: negotiation.comments || legacy.comments || "",
    };
  }, []);

  useEffect(() => {
    if (!selectedLead) return;
    const values = getLeadNegotiationValues(selectedLead);
    negForm.resetFields();
    negForm.setFieldsValue(values);

    focusedValueRef.current =
      negForm.getFieldValue("customerDemand") || selectedLead?.customerDemand;
  }, [getLeadNegotiationValues, negForm, selectedLead]);

  const handleValuesChange = useCallback(() => {}, []);

  const analytics = useMemo(() => {
    const customerNegotiation = formValues?.customerNegotiation || {};
    const demand = formValues?.customerDemand || 0;
    const target = formValues?.targetPrice || 0;

    const validQuotes = (formValues?.quotations || []).filter(
      (q) => q.quotedPrice > 0,
    );
    const sortedQuotes = [...validQuotes].sort(
      (a, b) => b.quotedPrice - a.quotedPrice,
    );
    const highestQuote = sortedQuotes[0]?.quotedPrice || 0;
    const bestDealer = sortedQuotes[0] || null;

    const margin = highestQuote > 0 ? highestQuote - demand : 0;
    const marginPercent = demand > 0 ? (margin / demand) * 100 : 0;
    const isMarginPositive = margin >= 0;
    const profitPotential =
      target > 0 && highestQuote > 0 ? highestQuote - target : 0;

    const sourcingInfo = bestDealer
      ? `${bestDealer.location} · ${bestDealer.contactNumber}`
      : "";

    const timeline = customerNegotiation.priceTimeline || [];
    const initialDemand =
      timeline.length > 0
        ? timeline[0].price
        : selectedLead?.customerDemand || demand;
    const demandDecrease = initialDemand > demand ? initialDemand - demand : 0;
    const demandDecreasePercent =
      initialDemand > 0 ? (demandDecrease / initialDemand) * 100 : 0;

    const isApproved =
      formValues?.negotiationStatus === NEGOTIATION_STATUS.APPROVED;
    const canMarkClosed = isMarginPositive && isApproved;

    return {
      highestQuote,
      bestDealer,
      margin,
      marginPercent,
      profitPotential,
      sourcingInfo,
      canMarkClosed,
      isMarginPositive,
      marginGap: margin < 0 ? Math.abs(margin) : 0,
      demandDecrease,
      demandDecreasePercent,
    };
  }, [formValues, selectedLead]);

  const buildNegotiationPayload = useCallback(
    (statusOverride) => {
      const values = negForm.getFieldsValue(true);
      const status = statusOverride || values.negotiationStatus;
      return {
        negotiation: {
          status,
          customer: {
            demand: values.customerDemand || null,
            targetPrice: values.targetPrice || null,
            accepted: Boolean(values.customerNegotiation?.accepted),
            acceptedAt: values.customerNegotiation?.acceptedAt || null,
            priceTimeline: values.customerNegotiation?.priceTimeline || [],
          },
          dealerQuotes: (values.quotations || []).map((quote, index) => ({
            quoteId: quote.quoteId || `DQ-${selectedId}-${index + 1}`,
            dealerName: quote.dealerName || "",
            contactNumber: quote.contactNumber || "",
            location: quote.location || "",
            sourcedBy: quote.sourcedBy || "",
            quotedPrice: quote.quotedPrice || null,
            priceTimeline: quote.priceTimeline || [],
            notes: quote.notes || "",
            status: quote.status || "Submitted",
          })),
          comments: values.comments || "",
          approvedAt:
            status === NEGOTIATION_STATUS.APPROVED ? dayjs().toISOString() : null,
          closedAt:
            status === NEGOTIATION_STATUS.CLOSED ? dayjs().toISOString() : null,
          appendAudit: {
            type: status === NEGOTIATION_STATUS.CLOSED ? "closed" : "saved",
            action:
              status === NEGOTIATION_STATUS.CLOSED
                ? "Marked Ready for Procurement"
                : "Negotiation Saved",
            note: values.comments || "",
            actor: "You",
            at: dayjs().toISOString(),
          },
          activity: {
            type: "negotiation",
            title:
              status === NEGOTIATION_STATUS.CLOSED
                ? "Negotiation closed"
                : "Negotiation updated",
            detail:
              status === NEGOTIATION_STATUS.CLOSED
                ? "Lead moved to procurement from negotiation desk."
                : "Negotiation values saved from negotiation desk.",
            actorName: "You",
            at: dayjs().toISOString(),
          },
        },
      };
    },
    [negForm, selectedId],
  );

  const saveNegotiation = useCallback(
    async (statusOverride) => {
      if (!selectedId) return;
      const nextStatus = statusOverride || negForm.getFieldValue("negotiationStatus");
      if (
        nextStatus === NEGOTIATION_STATUS.CLOSED &&
        !analytics?.canMarkClosed
      ) {
        message.warning(
          `Margin gap: ₹${analytics?.marginGap?.toLocaleString("en-IN") || 0}. Adjust before procurement.`,
        );
        return;
      }

      setSaving(true);
      try {
        const payload = buildNegotiationPayload(nextStatus);
        const res = await usedCarsApi.saveNegotiation(selectedId, payload);
        const updated = mapLeadForQueue(res.data);
        setLeads((prev) =>
          updated.currentStage === "negotiation"
            ? prev.map((lead) => (lead.id === updated.id ? updated : lead))
            : prev.filter((lead) => lead.id !== updated.id),
        );
        if (updated.currentStage !== "negotiation") {
          setSelectedId((prev) => {
            const nextLead = leads.find((lead) => lead.id !== prev);
            return nextLead?.id || null;
          });
        }
        negForm.setFieldValue("negotiationStatus", updated.negotiation?.status || nextStatus);
        message.success(
          nextStatus === NEGOTIATION_STATUS.CLOSED
            ? "Lead moved to procurement."
            : "Negotiation saved.",
        );
      } catch (error) {
        message.error(error?.message || "Negotiation save nahi ho paya.");
      } finally {
        setSaving(false);
      }
    },
    [
      analytics?.canMarkClosed,
      analytics?.marginGap,
      buildNegotiationPayload,
      leads,
      mapLeadForQueue,
      negForm,
      selectedId,
    ],
  );

  const openInspectionCertificate = useCallback(async () => {
    if (!selectedId) return;
    setOpeningCertificate(true);
    try {
      const blob = await usedCarsApi.downloadInspectionReportPdf(selectedId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      message.error(error?.message || "Inspection report open nahi ho paya.");
    } finally {
      setOpeningCertificate(false);
    }
  }, [selectedId]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Spin tip="Loading negotiation desk..." />
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <ShopOutlined className="text-xl" />
        </div>
        <h3 className="text-base font-black text-slate-900">
          No BGC-cleared cars in negotiation
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Complete the background check and mark the lead BGC Complete to bring it into this desk.
        </p>
        <Button className="mt-5 !rounded-xl" onClick={fetchNegotiationLeads}>
          Refresh Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      {timelineStyles}

      {/* SIDEBAR */}
      <div className="xl:w-[340px] flex-none">
        <div className="sticky top-6 flex h-[calc(100vh-280px)] flex-col gap-4">
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Negotiation Queue
            </p>
            <div className="relative">
              <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {filteredLeads.map((lead, idx) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <QueueCard
                    lead={lead}
                    active={selectedId === lead.id}
                    onClick={() => setSelectedId(lead.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* MAIN DESK */}
      <div className="min-w-0 flex-1">
        <Form
          form={negForm}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={getDefaultNegotiationValues()}
          requiredMark={false}
        >
          {/* Metrics */}
          <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <NegotiationMetricCard
              title="Customer Demand"
              value={
                formValues.customerDemand
                  ? `₹${formValues.customerDemand.toLocaleString("en-IN")}`
                  : selectedLead?.customerDemand
                    ? `₹${selectedLead.customerDemand.toLocaleString()}`
                    : "Not Set"
              }
              icon={<DollarOutlined />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
            <NegotiationMetricCard
              title="Internal Target"
              value={
                formValues.targetPrice
                  ? `₹${formValues.targetPrice.toLocaleString("en-IN")}`
                  : "Set Target"
              }
              icon={<HistoryOutlined />}
              colorClass="bg-sky-50 text-sky-600"
              subValue={
                analytics?.profitPotential > 0
                  ? `Spread: +₹${analytics.profitPotential.toLocaleString()}`
                  : null
              }
            />
            <NegotiationMetricCard
              title="Best Quotation"
              value={
                analytics?.highestQuote
                  ? `₹${analytics.highestQuote.toLocaleString("en-IN")}`
                  : "No Quotes"
              }
              icon={<ShopOutlined />}
              colorClass="bg-emerald-50 text-emerald-600"
              subValue={
                analytics?.bestDealer
                  ? `${analytics.bestDealer.dealerName} · ${analytics.sourcingInfo || "Unknown"}`
                  : "Awaiting vendors"
              }
            />
            <NegotiationMetricCard
              title="Autocredits Margin"
              value={
                analytics ? `₹${analytics.margin.toLocaleString("en-IN")}` : "—"
              }
              icon={<PercentageOutlined />}
              colorClass="bg-rose-50 text-rose-600"
              trend={
                analytics?.highestQuote > 0
                  ? {
                      value: `${analytics.marginPercent.toFixed(1)}%`,
                      positive: analytics.margin >= 0,
                      label: "vs demand",
                    }
                  : null
              }
              status={
                analytics?.isMarginPositive
                  ? { label: "Profitable", color: "emerald" }
                  : { label: "Under Demand", color: "rose" }
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT: Setup & Quotations */}
            <div className="lg:col-span-2 space-y-5">
              {/* Customer Hub */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <div
                  className={`flex cursor-pointer items-center justify-between ${isSellerHubCollapsed ? "" : "mb-6"}`}
                  onClick={() => setIsSellerHubCollapsed(!isSellerHubCollapsed)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <SearchOutlined className="text-lg" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1">
                        Customer Sourcing Hub
                      </p>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-black text-slate-900">
                          Seller Negotiation
                        </h2>
                        {formValues.customerDemand && (
                          <div className="flex items-center gap-2">
                            {!isSellerHubCollapsed && (
                              <span className="text-slate-300">|</span>
                            )}
                            <span className="text-emerald-600 font-black">
                              ₹
                              {formValues.customerDemand?.toLocaleString() ||
                                "0"}
                            </span>
                            {analytics.demandDecreasePercent > 0 && (
                              <Tag
                                color="rose"
                                className="font-bold border-0 !rounded-lg m-0 text-[10px]"
                              >
                                -{analytics.demandDecreasePercent.toFixed(1)}%
                                Drop
                              </Tag>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag className="!rounded-full border-2 border-sky-200 bg-sky-50 text-sky-700 m-0 font-semibold text-[10px] px-3 py-0.5">
                      Vahan Linked
                    </Tag>
                    <motion.div
                      animate={{ rotate: isSellerHubCollapsed ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DownOutlined className="text-xs text-slate-400" />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {!isSellerHubCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 border-t-2 border-slate-100 pt-6">
                        <VahanSnapshot
                          lead={selectedLead}
                          onOpenCertificate={openInspectionCertificate}
                          openingCertificate={openingCertificate}
                        />

                        <div className="grid gap-6 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x-2 divide-slate-100 pt-6 border-t-2 border-slate-100">
                          <div className="lg:col-span-3 pb-5 lg:pb-0 lg:pr-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Negotiate Demand
                              </p>
                              {analytics.demandDecreasePercent > 0 && (
                                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                  <ArrowDownOutlined className="text-[8px]" />
                                  {analytics.demandDecreasePercent.toFixed(1)}%
                                  Session Drop
                                </span>
                              )}
                            </div>
                            <Form.Item
                              label="Customer Demand (₹)"
                              name="customerDemand"
                              className="!mb-0"
                            >
                              <InputNumber
                                className="!w-full !rounded-xl !h-12 bg-slate-50 !font-black !text-lg"
                                placeholder="Current seller expectation"
                                formatter={(v) =>
                                  v
                                    ? `₹ ${v}`.replace(
                                        /\B(?=(\d{3})+(?!\d))/g,
                                        ",",
                                      )
                                    : ""
                                }
                                parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                                onFocus={() => {
                                  focusedValueRef.current =
                                    negForm.getFieldValue("customerDemand");
                                }}
                                onBlur={() => {
                                  const oldPrice = focusedValueRef.current;
                                  const newPrice =
                                    negForm.getFieldValue("customerDemand");
                                  recordNegotiationStep(
                                    newPrice,
                                    oldPrice,
                                    ["customerNegotiation", "priceTimeline"],
                                    "Original Demand",
                                  );
                                  focusedValueRef.current = newPrice;
                                }}
                              />
                            </Form.Item>
                            <Form.Item
                              label="ACILLP Target Purchase (₹)"
                              name="targetPrice"
                              className="!mb-0"
                            >
                              <InputNumber
                                className="!w-full !rounded-xl !h-11"
                                placeholder="Target purchase price"
                                formatter={(v) =>
                                  v
                                    ? `₹ ${v}`.replace(
                                        /\B(?=(\d{3})+(?!\d))/g,
                                        ",",
                                      )
                                    : ""
                                }
                                parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                              />
                            </Form.Item>
                          </div>

                          <div className="lg:col-span-2 pt-5 lg:pt-0 lg:pl-6 flex flex-col">
                            <div className="flex-1">
                              <p className="mb-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Demand Evolution
                              </p>
                              <div className="max-h-[340px] overflow-y-auto custom-scrollbar pl-2 pr-2">
                                <Form.Item
                                  name={[
                                    "customerNegotiation",
                                    "priceTimeline",
                                  ]}
                                  noStyle
                                >
                                  <PremiumTimeline
                                    currentPrice={formValues.customerDemand}
                                    labelPrefix="Demand"
                                  />
                                </Form.Item>
                              </div>
                            </div>

                            {/* Acceptance Gate */}
                            <div className="mt-6 pt-5 border-t-2 border-slate-100">
                              <div
                                className={`rounded-xl border-2 p-4 transition-all ${
                                  formValues.customerNegotiation?.accepted
                                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                                    : "border-slate-200 bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                        formValues.customerNegotiation?.accepted
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "bg-slate-200 text-slate-500"
                                      }`}
                                    >
                                      <CheckCircleFilled className="text-base" />
                                    </div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                      Final Acceptance
                                    </p>
                                  </div>
                                  {formValues.customerNegotiation
                                    ?.acceptedAt && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {dayjs(
                                        formValues.customerNegotiation
                                          .acceptedAt,
                                      ).format("DD MMM · HH:mm")}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <Form.Item
                                    name={["customerNegotiation", "accepted"]}
                                    valuePropName="checked"
                                    noStyle
                                  >
                                    <Checkbox className="text-xs font-bold text-slate-700">
                                      Confirmed: Customer accepted ₹
                                      {formValues.customerDemand?.toLocaleString()}
                                    </Checkbox>
                                  </Form.Item>

                                  <Button
                                    type="primary"
                                    block
                                    size="large"
                                    disabled={
                                      !formValues.customerDemand ||
                                      formValues.customerNegotiation?.accepted
                                    }
                                    className={`!h-11 !rounded-xl !font-black !text-xs shadow-md transition-all ${
                                      formValues.customerNegotiation?.accepted
                                        ? "!bg-emerald-600 !border-emerald-600"
                                        : "!bg-slate-900 !border-slate-900"
                                    }`}
                                    onClick={() => {
                                      negForm.setFieldValue(
                                        ["customerNegotiation", "accepted"],
                                        true,
                                      );
                                      negForm.setFieldValue(
                                        ["customerNegotiation", "acceptedAt"],
                                        dayjs().toISOString(),
                                      );
                                      handleValuesChange(
                                        null,
                                        negForm.getFieldsValue(),
                                      );
                                      saveNegotiation(
                                        negForm.getFieldValue("negotiationStatus"),
                                      );
                                    }}
                                  >
                                    {formValues.customerNegotiation?.accepted
                                      ? "Negotiation Finalized"
                                      : "Lock Agreed Price"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quotations */}
              <div className="flex items-center gap-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Dealer Quotation Hub
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Form.List name="quotations">
                {(fields, { add, remove }) => (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {fields.map((field, idx) => (
                        <motion.div
                          key={field.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <QuotationCard
                            field={field}
                            remove={remove}
                            values={formValues}
                            bgcForm={negForm}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <Button
                      type="dashed"
                      onClick={() =>
                        add(getDefaultNegotiationValues().quotations[0])
                      }
                      block
                      icon={<PlusOutlined />}
                      className="!h-12 !rounded-2xl border-2 border-slate-300 !text-slate-600 hover:!border-sky-500 hover:!text-sky-600 font-bold"
                    >
                      Add New Quotation
                    </Button>
                  </div>
                )}
              </Form.List>
            </div>

            {/* RIGHT: Summary & Status */}
            <div className="space-y-5">
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Negotiation Status
                </p>
                <Form.Item name="negotiationStatus" className="!mb-4">
                  <Select
                    className="!w-full !h-11 !rounded-xl"
                    options={Object.values(NEGOTIATION_STATUS).map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  label="Admin / Evaluator Comments"
                  name="comments"
                  className="!mb-0"
                >
                  <TextArea
                    rows={5}
                    placeholder="Internal notes, counter-offers, vendor feedback..."
                    className="!rounded-xl"
                  />
                </Form.Item>

                {formValues.negotiationStatus ===
                  NEGOTIATION_STATUS.NEGOTIATING && (
                  <Button
                    block
                    ghost
                    type="primary"
                    className="mt-4 !h-10 !rounded-xl font-bold"
                    loading={saving}
                    onClick={() => {
                      negForm.setFieldValue(
                        "negotiationStatus",
                        NEGOTIATION_STATUS.AWAITING_APPROVAL,
                      );
                      saveNegotiation(NEGOTIATION_STATUS.AWAITING_APPROVAL);
                    }}
                  >
                    Request Manager Approval
                  </Button>
                )}

                {formValues.negotiationStatus ===
                  NEGOTIATION_STATUS.AWAITING_APPROVAL && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4 border-2 border-amber-200">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-2">
                      Manager Approval Required
                    </p>
                    <Button
                      block
                      type="primary"
                      className="!h-10 !rounded-xl !bg-amber-500 !border-amber-500 font-bold"
                      loading={saving}
                      onClick={() => {
                        negForm.setFieldValue(
                          "negotiationStatus",
                          NEGOTIATION_STATUS.APPROVED,
                        );
                        saveNegotiation(NEGOTIATION_STATUS.APPROVED);
                      }}
                    >
                      Approve Quotation
                    </Button>
                  </div>
                )}

                <Button
                  type="primary"
                  icon={
                    formValues.negotiationStatus ===
                    NEGOTIATION_STATUS.APPROVED ? (
                      <CheckCircleOutlined />
                    ) : (
                      <SaveOutlined />
                    )
                  }
                  block
                  loading={saving}
                  disabled={
                    formValues.negotiationStatus ===
                      NEGOTIATION_STATUS.AWAITING_APPROVAL ||
                    (formValues.negotiationStatus ===
                      NEGOTIATION_STATUS.APPROVED &&
                      !analytics?.canMarkClosed)
                  }
                  className={`mt-6 !h-12 !rounded-xl !font-bold transition-all ${
                    formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED
                      ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                      : "!bg-slate-900 hover:!bg-slate-800"
                  }`}
                  onClick={() => {
                    if (
                      formValues.negotiationStatus ===
                      NEGOTIATION_STATUS.APPROVED
                    ) {
                      if (!analytics?.canMarkClosed) {
                        message.warning(
                          `Margin gap: ₹${analytics.marginGap.toLocaleString()}. Adjust to proceed.`,
                        );
                        return;
                      }
                      negForm.setFieldValue("negotiationStatus", NEGOTIATION_STATUS.CLOSED);
                      saveNegotiation(NEGOTIATION_STATUS.CLOSED);
                    } else {
                      saveNegotiation();
                    }
                  }}
                >
                  {formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED
                    ? `Ready for Procurement ${!analytics?.isMarginPositive ? `(₹-${analytics?.marginGap.toLocaleString()})` : ""}`
                    : "Save Progress"}
                </Button>

                {formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED &&
                  !analytics?.canMarkClosed && (
                    <div className="mt-4 rounded-xl bg-rose-50 p-3 border-2 border-rose-200">
                      <p className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-2">
                        <LockOutlined /> Compliance Blocked
                      </p>
                      <p className="mt-1 text-[10px] text-rose-600 font-bold">
                        Gap: ₹{analytics?.marginGap.toLocaleString()}. Margin
                        must be positive.
                      </p>
                    </div>
                  )}
              </div>

              {/* Ranking */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Quotation Ranking
                </p>
                <div className="space-y-3">
                  {(formValues.quotations || [])
                    .filter((q) => q.quotedPrice > 0)
                    .sort((a, b) => b.quotedPrice - a.quotedPrice)
                    .map((q, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag
                            color={i === 0 ? "gold" : "default"}
                            className="font-bold border-0 !rounded-lg !px-2.5 !py-1 m-0"
                          >
                            #{i + 1}
                          </Tag>
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                            {q.dealerName || "Unknown"}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-black ${
                            i === 0 ? "text-emerald-600" : "text-slate-600"
                          }`}
                        >
                          ₹{q.quotedPrice.toLocaleString()}
                        </span>
                      </motion.div>
                    ))}
                  {(formValues.quotations || []).filter(
                    (q) => q.quotedPrice > 0,
                  ).length === 0 && (
                    <p className="text-center py-6 text-xs text-slate-400 italic">
                      No quotations entered yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
