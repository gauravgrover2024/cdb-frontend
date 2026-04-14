import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
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
  RightOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  EyeOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  NEGOTIATION_STORAGE_KEY,
  MOCK_BGC_CLEARED_LEADS,
  NEGOTIATION_STATUS,
  VERIFIED_VENDORS,
  STAFF_MEMBERS,
  getDefaultNegotiationValues,
} from "./constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

const { TextArea } = Input;

// ── Notification Metric Card ─────────────────────────────────────
function NegotiationMetricCard({ title, value, subValue, icon, colorClass, trend, status }) {
  return (
    <div className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colorClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{title}</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        </div>
        {(trend || status) && (
          <div className="text-right">
            {trend && (
              <>
                <p className={`text-[10px] font-bold ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend.positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {trend.value}
                </p>
                <p className="text-[10px] text-slate-400">{trend.label}</p>
              </>
            )}
            {status && (
              <Tag color={status.color} className="font-bold border-0 !rounded-full !px-3 m-0 lowercase tracking-tighter">
                {status.label}
              </Tag>
            )}
          </div>
        )}
      </div>
      {subValue && (
        <div className="mt-3 border-t border-slate-100 pt-2 dark:border-white/5">
          <p className="text-[10px] font-medium text-slate-500">{subValue}</p>
        </div>
      )}
    </div>
  );
}

// ── Reusable Premium Timeline ────────────────────────────────────
function PremiumTimeline({ value, timeline, currentPrice, labelPrefix = "Offer" }) {
  const fullTimeline = useMemo(() => {
    // We want the timeline to show: [Current Price] -> [Past Price N] -> ... -> [Baseline]
    // timeline array is stored in chronological order [Oldest -> Newest]
    const history = [...(value || timeline || [])];
    const list = [];

    // Add current price as the active head
    if (currentPrice !== undefined && currentPrice !== null) {
      list.push({ 
        price: currentPrice, 
        timestamp: new Date().toISOString(),
        isCurrent: true 
      });
    }

    // Add history entries
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((entry, idx) => {
      // Rule: Always show the baseline, and show history entries unless they are consecutively identical 
      const isBaseline = idx === reversedHistory.length - 1;
      const isDuplicate = list.length > 1 && entry.price === list[list.length - 1].price;
      
      if (isBaseline || !isDuplicate) {
        list.push(entry);
      }
    });

    return list;
  }, [timeline, currentPrice]);

  if (fullTimeline.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-slate-300 dark:text-slate-600">
        <ClockCircleOutlined className="text-2xl mb-2 opacity-50" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Initial {labelPrefix}</p>
      </div>
    );
  }

  return (
    <Timeline 
      className="!text-xs premium-timeline !mt-2"
      items={fullTimeline.map((t, i) => ({
        children: (
          <div className="group relative -mt-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`font-black tracking-tight ${t.isCurrent ? "text-slate-900 dark:text-white text-sm" : "text-slate-500 dark:text-slate-400 text-xs"}`}>
                ₹{t.price?.toLocaleString() || "0"}
              </span>
              {t.isCurrent && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
              {t.isCurrent ? (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live Strategy
                </span>
              ) : (
                <span>{dayjs(t.timestamp).format("DD MMM · HH:mm")}</span>
              )}
            </div>
          </div>
        ),
        color: t.isCurrent ? "emerald" : "gray",
        dot: t.isCurrent ? (
          <div className="bg-emerald-500 rounded-full p-0.5 border-2 border-white dark:border-slate-800 shadow-sm shadow-emerald-500/50">
            <CheckCircleOutlined className="text-[8px] text-white" />
          </div>
        ) : (
          <div className="bg-slate-200 dark:bg-slate-700 rounded-full w-2.5 h-2.5 border-2 border-white dark:border-slate-800" />
        )
      }))}
    />
  );
}

// ── Quotation Form Card (Overhaul) ────────────────────────────────
function QuotationCard({ field, remove, values, bgcForm, selectedId }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const focusedLocalValueRef = React.useRef(null);
  const qData = values.quotations?.[field.name] || {};
  const isVerified = VERIFIED_VENDORS.some(v => v.name === qData.dealerName);
  const vendorInfo = VERIFIED_VENDORS.find(v => v.name === qData.dealerName);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-white/[0.03]">
      {/* Header / Summary Bar */}
      <div 
        className={`flex cursor-pointer items-center justify-between px-5 py-4 ${isCollapsed ? "" : "border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5"}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {field.name + 1}
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {isCollapsed ? "Quotation Summary" : "Dealer Quotation Entry"}
            </p>
            {isCollapsed ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]">{qData.dealerName || "Draft Dealer"}</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{qData.quotedPrice?.toLocaleString() || "0"}</span>
              </div>
            ) : (
              isVerified && (
                <p className="text-[10px] font-bold text-emerald-500">
                  Verified Vendor · {vendorInfo?.avgIncrementPercent}% Avg. Hist. Increment
                </p>
              )
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isCollapsed && (qData.priceTimeline || []).length > 0 && (
            <Tag color="cyan" className="font-bold border-0 !rounded-lg m-0">
              +{(((qData.quotedPrice - qData.priceTimeline[0].price) / qData.priceTimeline[0].price) * 100).toFixed(1)}% Session Incr.
            </Tag>
          )}
          <div className="flex items-center gap-2">
            <Button 
              type="text" 
              danger 
              icon={<CloseOutlined />} 
              onClick={(e) => { e.stopPropagation(); remove(field.name); }}
              className="hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
            />
            {isCollapsed ? <RightOutlined className="text-xs text-slate-400" /> : <DownOutlined className="text-xs text-slate-400" />}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/5">
          {/* Left Column: Form Fields (3/5 width) */}
          <div className="lg:col-span-3 p-5 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Form.Item 
                {...field} 
                label="Dealer Name / Profile" 
                name={[field.name, "dealerName"]}
                className="!mb-0"
              >
                <Select
                  showSearch
                  placeholder="Search or enter vendor..."
                  options={VERIFIED_VENDORS.map(v => ({ value: v.name, label: v.name }))}
                  className="!rounded-xl !h-11"
                  onSelect={(val) => {
                    const vendor = VERIFIED_VENDORS.find(v => v.name === val);
                    if (vendor) {
                      const currentQuotes = bgcForm.getFieldValue("quotations");
                      currentQuotes[field.name] = {
                        ...currentQuotes[field.name],
                        contactNumber: vendor.contact,
                        location: vendor.location,
                      };
                      bgcForm.setFieldsValue({ quotations: currentQuotes });
                    }
                  }}
                />
              </Form.Item>

              <Form.Item {...field} label="Sourced By" name={[field.name, "sourcedBy"]} className="!mb-0">
                <Select
                  placeholder="Select staff..."
                  options={STAFF_MEMBERS.map(s => ({ value: s, label: s }))}
                  className="!rounded-xl !h-11"
                />
              </Form.Item>

              <Form.Item {...field} label="Contact" name={[field.name, "contactNumber"]} className="!mb-0">
                <Input prefix={<PhoneOutlined />} placeholder="987..." className="!rounded-xl !h-11" />
              </Form.Item>

              <Form.Item {...field} label="Location" name={[field.name, "location"]} className="!mb-0">
                <Input prefix={<EnvironmentOutlined />} placeholder="City" className="!rounded-xl !h-11" />
              </Form.Item>

              <Form.Item 
                {...field} 
                label={
                  <div className="flex items-center justify-between w-full">
                    <span>Quoted Price (₹)</span>
                    {qData.priceTimeline?.length > 0 && qData.quotedPrice > qData.priceTimeline[0].price && (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <ArrowUpOutlined className="text-[8px]" /> {(((qData.quotedPrice - qData.priceTimeline[0].price) / qData.priceTimeline[0].price) * 100).toFixed(1)}% Session Incr.
                      </span>
                    )}
                  </div>
                }
                name={[field.name, "quotedPrice"]}
                className="!mb-0 md:col-span-2"
              >
                <InputNumber
                  className="!w-full !rounded-xl !h-11 bg-slate-50 dark:bg-white/5 !font-black !text-base"
                  placeholder="Enter current offer..."
                  formatter={(v) => (v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "")}
                  parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                  onFocus={() => {
                    const currentQuotes = bgcForm.getFieldValue("quotations");
                    focusedLocalValueRef.current = currentQuotes[field.name]?.quotedPrice;
                  }}
                  onBlur={() => {
                    const oldPrice = focusedLocalValueRef.current;
                    const currentQuotes = bgcForm.getFieldValue("quotations");
                    const quote = currentQuotes[field.name];
                    const newPrice = quote.quotedPrice;
                    
                    if (newPrice === undefined || newPrice === null) return;
                    const timeline = [...(quote.priceTimeline || [])];
                    if (timeline.length === 0) {
                       // Proactive Seeding: Ensure baseline is present before recording counter-offer
                       timeline.push({ price: oldPrice || newPrice, timestamp: dayjs().toISOString(), label: "Initial Quotation" });
                    }

                    if (oldPrice !== undefined && oldPrice !== null && oldPrice !== newPrice) {
                      const lastPrice = timeline[timeline.length - 1]?.price;
                      if (lastPrice !== oldPrice) {
                        timeline.push({ price: oldPrice, timestamp: dayjs().toISOString() });
                      }
                    }
                    
                    quote.priceTimeline = timeline;
                    bgcForm.setFieldsValue({ quotations: currentQuotes });
                    
                    // Manual persist
                    localStorage.setItem(`${NEGOTIATION_STORAGE_KEY}_${selectedId}`, JSON.stringify(bgcForm.getFieldsValue()));
                    focusedLocalValueRef.current = newPrice;
                  }}
                />
              </Form.Item>
            </div>
          </div>

          {/* Right Column: Timeline (2/5 width) */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-transparent">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Offer History</p>
              <HistoryOutlined className="text-slate-300 text-[10px]" />
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar max-h-[400px]">
              <PremiumTimeline timeline={qData.priceTimeline} currentPrice={qData.quotedPrice} labelPrefix="Quotation" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vahan Snapshot (True Reference) ──────────────────────────────
function VahanSnapshot({ lead }) {
  const rows = [
    { label: "Owner Name", value: lead?.name || "—" },
    { label: "Ownership No.", value: lead?.ownership || "—" },
    { label: "Make / Model", value: [lead?.make, lead?.model, lead?.variant].filter(Boolean).join(" ") || "—" },
    { label: "Fuel Type", value: lead?.fuel || "—" },
    { label: "Mfg Year", value: lead?.mfgYear || "—" },
    { label: "Regd Date", value: "15 Oct 2021", flag: false },
    { label: "RC Expiry", value: "14 Oct 2036", flag: false },
    { label: "Road Tax Expiry", value: "14 Oct 2036", flag: false },
    { label: "Hypothecation", value: "No", flag: false },
    { label: "Blacklisted", value: "No", flag: false },
    { label: "Theft Record", value: "No", flag: false },
    { label: "Challan Pending", value: "₹4,500", flag: true },
    { label: "RTO NOC", value: "Not Issued", flag: false },
  ];

  return (
    <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        Vahan Snapshot — Desk Reference
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ label, value, flag }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {flag === true ? (
                <ExclamationCircleFilled className="text-[10px] text-rose-500" />
              ) : (
                <CheckCircleFilled className="text-[10px] text-emerald-500" />
              )}
              <p className={`text-xs font-bold ${flag === true ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                {value}
              </p>
              {label === "Challan Pending" && <EyeOutlined className="text-[10px] text-sky-500 cursor-pointer ml-1" />}
            </div>
          </div>
        ))}
      </div>
      
      {/* Inspection Quick Action */}
      <div className="mt-4 border-t border-slate-200 dark:border-white/10 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Tag className="!rounded-md border-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 m-0 text-[10px] font-bold">
             Inspection Verified
           </Tag>
        </div>
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          className="!p-0 !h-auto text-sky-600 hover:text-sky-700 text-xs font-bold transition-all"
          onClick={() => message.info("Opening Full Inspection Report...")}
        >
          View Full Inspection Certificate
        </Button>
      </div>
    </div>
  );
}

// ── Lead Card ────────────────────────────────────────────────────
function QueueCard({ lead, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[22px] border p-3.5 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-white/60 dark:text-slate-400" : "text-slate-400"}`}>
            {lead.regNo}
          </p>
          <p className="mt-1 text-sm font-black leading-tight">
            {lead.make} {lead.model} {lead.variant}
          </p>
          <p className={`mt-0.5 text-[11px] font-bold ${active ? "text-white/70 dark:text-slate-500" : "text-slate-500"}`}>
            {lead.mfgYear} · {lead.name}
          </p>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black truncate lowercase tracking-tighter ${active ? "bg-white/10 dark:bg-slate-950/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
            {lead.bgcStatus}
          </div>
          <p className="mt-2 text-xs font-black">₹{(lead.customerDemand / 100000).toFixed(2)}L</p>
        </div>
      </div>
      {(lead.tags || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {lead.tags.map(t => (
            <span key={t} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${active ? "bg-white/15 dark:bg-slate-900/10" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"}`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function UsedCarNegotiationDesk() {
  const [negForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(MOCK_BGC_CLEARED_LEADS[0].id);
  const [search, setSearch] = useState("");
  const [isSellerHubCollapsed, setIsSellerHubCollapsed] = useState(false);
  const focusedValueRef = React.useRef(null);
  
  // ── Unified Recording Logic ──────────────────────────────────────
  const recordNegotiationStep = useCallback((newPrice, oldPrice, timelinePath, baselineLabel) => {
    if (newPrice === undefined || newPrice === null) return;
    
    let currentTimeline = [...(negForm.getFieldValue(timelinePath) || [])];
    
    // Safety: If somehow empty, use the first recorded oldPrice or current newPrice as baseline
    if (currentTimeline.length === 0) {
      currentTimeline = [{ price: oldPrice || newPrice, timestamp: dayjs().toISOString(), label: baselineLabel }];
    }

    // Add historical movement if price actually transitioned
    if (oldPrice !== undefined && oldPrice !== null && oldPrice !== newPrice) {
      const lastEntry = currentTimeline[currentTimeline.length - 1];
      
      // Only push if this particular movement hasn't just been recorded
      if (!lastEntry || lastEntry.price !== oldPrice) {
        currentTimeline.push({ 
          price: oldPrice, 
          timestamp: dayjs().toISOString(),
          label: currentTimeline.length === 0 ? baselineLabel : undefined 
        });
      }
    }

    // Explicitly update form and PERSIST immediately (since setFieldValue doesn't trigger onValuesChange)
    negForm.setFieldValue(timelinePath, currentTimeline);
    localStorage.setItem(`${NEGOTIATION_STORAGE_KEY}_${selectedId}`, JSON.stringify(negForm.getFieldsValue()));
  }, [negForm, selectedId]);

  const formValues = Form.useWatch([], negForm) || getDefaultNegotiationValues();

  // Unified Styling Block
  const timelineStyles = (
    <style>
      {`
        .premium-timeline .ant-timeline-item-tail {
          border-inline-start: 2px solid #f1f5f9 !important;
          left: 5px !important;
        }
        .dark .premium-timeline .ant-timeline-item-tail {
          border-inline-start: 2px solid rgba(255,255,255,0.05) !important;
        }
        .premium-timeline .ant-timeline-item-head {
          background: transparent !important;
          left: 5px !important;
        }
        .premium-timeline .ant-timeline-item-content {
          margin-inline-start: 28px !important;
          padding-bottom: 20px !important;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}
    </style>
  );

  const selectedLead = useMemo(() => 
    MOCK_BGC_CLEARED_LEADS.find(l => l.id === selectedId),
    [selectedId]
  );

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase();
    return MOCK_BGC_CLEARED_LEADS.filter(l => 
      l.regNo?.toLowerCase().includes(s) || 
      l.name?.toLowerCase().includes(s) || 
      l.model?.toLowerCase().includes(s)
    );
  }, [search]);

  // Persistence logic 
  useEffect(() => {
    const saved = localStorage.getItem(`${NEGOTIATION_STORAGE_KEY}_${selectedId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration/Safety: Always ensure baseline exists
      if (!parsed.customerNegotiation?.priceTimeline || parsed.customerNegotiation.priceTimeline.length === 0) {
        if (!parsed.customerNegotiation) parsed.customerNegotiation = {};
        parsed.customerNegotiation.priceTimeline = selectedLead?.customerDemand ? [{ price: selectedLead.customerDemand, timestamp: dayjs().toISOString(), label: "Original Demand" }] : [];
      }
      negForm.setFieldsValue(parsed);
    } else {
      negForm.resetFields();
      negForm.setFieldsValue({ 
        customerDemand: selectedLead?.customerDemand,
        customerNegotiation: {
          priceTimeline: selectedLead?.customerDemand ? [{ price: selectedLead.customerDemand, timestamp: dayjs().toISOString(), label: "Original Demand" }] : []
        },
        quotations: getDefaultNegotiationValues().quotations 
      });
    }
    
    // CRITICAL: Initialize focus refs so the FIRST change has an 'oldPrice' to record
    focusedValueRef.current = negForm.getFieldValue("customerDemand") || selectedLead?.customerDemand;
  }, [selectedId, negForm, selectedLead]);

  const handleValuesChange = useCallback((_, allValues) => {
    localStorage.setItem(`${NEGOTIATION_STORAGE_KEY}_${selectedId}`, JSON.stringify(allValues));
  }, [selectedId]);

  // ── Auto Analytics ───────────────────────────────────────────────
  const analytics = useMemo(() => {
    const customerNegotiation = formValues?.customerNegotiation || {};
    const demand = formValues?.customerDemand || 0;
    const target = formValues?.targetPrice || 0;
    
    const validQuotes = (formValues?.quotations || []).filter(q => q.quotedPrice > 0);
    const sortedQuotes = [...validQuotes].sort((a,b) => b.quotedPrice - a.quotedPrice);
    const highestQuote = sortedQuotes[0]?.quotedPrice || 0;
    const bestDealer = sortedQuotes[0] || null;

    const margin = highestQuote > 0 ? highestQuote - demand : 0;
    const marginPercent = demand > 0 ? (margin / demand) * 100 : 0;
    const isMarginPositive = margin >= 0;
    const profitPotential = target > 0 && highestQuote > 0 ? highestQuote - target : 0;

    const sourcingInfo = bestDealer ? `${bestDealer.location} · ${bestDealer.contactNumber}` : "";

    // DROP METRICS: Compare against the very first entry in the timeline (The Baseline)
    // IMPORTANT: If timeline is empty, we must use the lead's original demand as the comparison root
    const timeline = customerNegotiation.priceTimeline || [];
    const initialDemand = timeline.length > 0 ? timeline[0].price : (selectedLead?.customerDemand || demand);
    const demandDecrease = initialDemand > demand ? initialDemand - demand : 0;
    const demandDecreasePercent = initialDemand > 0 ? (demandDecrease / initialDemand) * 100 : 0;

    // PROCUREMENT LOGIC
    const isApproved = formValues?.negotiationStatus === NEGOTIATION_STATUS.APPROVED;
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
      demandDecreasePercent
    };
  }, [formValues]);

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      {timelineStyles}
      {/* ── Left Sidebar: Queue ────────────────────────────────────── */}
      <div className="xl:w-[320px] flex-none">
        <div className="sticky top-6 flex h-[calc(100vh-280px)] flex-col gap-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Negotiation Queue
            </p>
            <div className="relative mt-3">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {filteredLeads.map(lead => (
              <QueueCard 
                key={lead.id} 
                lead={lead} 
                active={selectedId === lead.id}
                onClick={() => setSelectedId(lead.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Desk ──────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <Form
          form={negForm}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={getDefaultNegotiationValues()}
          requiredMark={false}
        >
          {/* Header Dashboard */}
          <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <NegotiationMetricCard 
              title="Customer Demand"
              value={formValues.customerDemand ? `₹${formValues.customerDemand.toLocaleString("en-IN")}` : (selectedLead?.customerDemand ? `₹${selectedLead.customerDemand.toLocaleString()}` : "Not Set")}
              icon={<DollarOutlined />}
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            />
            <NegotiationMetricCard 
              title="Internal Target"
              value={formValues.targetPrice ? `₹${formValues.targetPrice.toLocaleString("en-IN")}` : "Set Target"}
              icon={<HistoryOutlined />}
              colorClass="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
              subValue={analytics?.profitPotential > 0 ? `Spread: +₹${analytics.profitPotential.toLocaleString()}` : null}
            />
            <NegotiationMetricCard 
              title="Best Quotation"
              value={analytics?.highestQuote ? `₹${analytics.highestQuote.toLocaleString("en-IN")}` : "No Quotes"}
              icon={<ShopOutlined />}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              subValue={analytics?.bestDealer ? `${analytics.bestDealer.dealerName} · ${analytics.sourcingInfo || "Unknown"}` : "Awaiting vendors"}
            />
            <NegotiationMetricCard 
              title="Autocredits Margin"
              value={analytics ? `₹${analytics.margin.toLocaleString("en-IN")}` : "—"}
              icon={<PercentageOutlined />}
              colorClass="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
              trend={analytics?.highestQuote > 0 ? { 
                value: `${analytics.marginPercent.toFixed(1)}%`, 
                positive: analytics.margin >= 0,
                label: "vs demand" 
              } : null}
              status={analytics?.isMarginPositive ? { label: "Profitable", color: "emerald" } : { label: "Under Demand", color: "rose" }}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Col: Setup & Quotations */}
            <div className="lg:col-span-2 space-y-4">
              {/* ── Customer Hub ── */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div 
                  className={`flex cursor-pointer items-center justify-between ${isSellerHubCollapsed ? "" : "mb-6"}`}
                  onClick={() => setIsSellerHubCollapsed(!isSellerHubCollapsed)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                      <SearchOutlined />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-500">Customer Sourcing Hub</p>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                          Seller Negotiation 
                        </h2>
                        {formValues.customerDemand && (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            {!isSellerHubCollapsed && <span className="text-slate-300 mx-1">|</span>}
                            <span className="text-emerald-500 font-black">₹{formValues.customerDemand?.toLocaleString() || "0"}</span>
                            {analytics.demandDecreasePercent > 0 && (
                              <Tag color="rose" className="font-bold border-0 !rounded-lg m-0 text-[10px] px-2 py-0">
                                -{analytics.demandDecreasePercent.toFixed(1)}% Session Drop
                              </Tag>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag className="!rounded-full border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 m-0">
                      Vahan Snapshot Linked
                    </Tag>
                    {isSellerHubCollapsed ? <RightOutlined className="text-xs text-slate-400" /> : <DownOutlined className="text-xs text-slate-400" />}
                  </div>
                </div>

                <div 
                  className="mt-6 border-t border-slate-100 dark:border-white/5 pt-6"
                  style={{ display: isSellerHubCollapsed ? 'none' : 'block' }}
                >
                  <VahanSnapshot lead={selectedLead} />

                  <div className="grid gap-6 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/5 pt-6 border-t border-slate-100 dark:border-white/5">
                    <div className="lg:col-span-3 pb-5 lg:pb-0 lg:pr-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Negotiate Demand</p>
                        {analytics.demandDecreasePercent > 0 && (
                          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                            <ArrowDownOutlined className="text-[8px]" /> {analytics.demandDecreasePercent.toFixed(1)}% Session Drop
                          </span>
                        )}
                      </div>
                      <Form.Item label="Customer Demand (₹)" name="customerDemand" className="!mb-0">
                        <InputNumber
                          className="!w-full !rounded-xl !h-12 bg-slate-50 dark:bg-white/5 !font-black !text-lg"
                          placeholder="Current seller expectation"
                          formatter={(v) => (v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "")}
                          parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                          onFocus={() => {
                            focusedValueRef.current = negForm.getFieldValue("customerDemand");
                          }}
                          onBlur={() => {
                            const oldPrice = focusedValueRef.current;
                            const newPrice = negForm.getFieldValue("customerDemand");
                            recordNegotiationStep(newPrice, oldPrice, ["customerNegotiation", "priceTimeline"], "Original Demand");
                            focusedValueRef.current = newPrice;
                          }}
                        />
                      </Form.Item>
                      <Form.Item label="ACILLP Target Purchase (₹)" name="targetPrice" className="!mb-0">
                        <InputNumber
                          className="!w-full !rounded-xl"
                          placeholder="Target purchase price"
                          formatter={(v) => (v ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "")}
                          parser={(v) => v?.replace(/₹\s?|(,*)/g, "")}
                        />
                      </Form.Item>
                    </div>

                    <div className="lg:col-span-2 pt-5 lg:pt-0 lg:pl-6 border-l border-slate-100 dark:border-white/5 flex flex-col h-full">
                      <div className="flex-1">
                        <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Demand Evolution</p>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar pl-4 pr-2 pt-2 pb-10">
                          <Form.Item name={["customerNegotiation", "priceTimeline"]} noStyle>
                             <PremiumTimeline 
                                currentPrice={formValues.customerDemand} 
                                labelPrefix="Demand" 
                             />
                          </Form.Item>
                        </div>
                      </div>

                      {/* ── Customer Acceptance Gate ── */}
                      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                        <div className={`rounded-2xl border p-4 transition-all ${
                          formValues.customerNegotiation?.accepted 
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 shadow-sm"
                            : "border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-transparent"
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                formValues.customerNegotiation?.accepted 
                                  ? "bg-emerald-100 text-emerald-600" 
                                  : "bg-slate-200 text-slate-500"
                              }`}>
                                <CheckCircleFilled className="text-sm" />
                              </div>
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Final Acceptance</p>
                            </div>
                            {formValues.customerNegotiation?.acceptedAt && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {dayjs(formValues.customerNegotiation.acceptedAt).format("DD MMM · HH:mm")}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3">
                            <Form.Item name={["customerNegotiation", "accepted"]} valuePropName="checked" noStyle>
                               <Checkbox className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                 Confirmed: Customer has accepted final price of ₹{formValues.customerDemand?.toLocaleString()}
                               </Checkbox>
                            </Form.Item>
                            
                            <Button 
                              type="primary" 
                              block 
                              size="large"
                              disabled={!formValues.customerDemand || formValues.customerNegotiation?.accepted}
                              className={`!h-10 !rounded-xl !font-black !text-xs shadow-md transition-all ${
                                formValues.customerNegotiation?.accepted 
                                  ? "!bg-emerald-600 !border-emerald-600 cursor-default" 
                                  : "!bg-slate-950 !border-slate-950 dark:!bg-white dark:!text-slate-950"
                              }`}
                              onClick={() => {
                                negForm.setFieldValue(["customerNegotiation", "accepted"], true);
                                negForm.setFieldValue(["customerNegotiation", "acceptedAt"], dayjs().toISOString());
                                handleValuesChange(null, negForm.getFieldsValue());
                                message.success("Negotiation finalized and accepted!");
                              }}
                            >
                              {formValues.customerNegotiation?.accepted ? "Negotiation Finalized" : "Lock Agreed Price"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Quotation Hub ── */}
              <div className="flex items-center gap-3 mb-2 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Dealer Quotation Hub
                </p>
                <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
              </div>

              {/* Dynamic Quotations List */}
              <Form.List name="quotations">
                {(fields, { add, remove }) => (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <QuotationCard 
                        key={field.key} 
                        field={field} 
                        remove={remove} 
                        values={formValues} 
                        bgcForm={negForm}
                        selectedId={selectedId}
                      />
                    ))}
                    <Button 
                      type="dashed" 
                      onClick={() => add(getDefaultNegotiationValues().quotations[0])} 
                      block 
                      icon={<PlusOutlined />}
                      className="!h-12 !rounded-[22px] border-slate-300 !text-slate-500 hover:!border-sky-500 hover:!text-sky-500 dark:border-white/10"
                    >
                      Add New Quotation
                    </Button>
                  </div>
                )}
              </Form.List>
            </div>

            {/* Right Col: Summary & Status */}
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Negotiation Status
                </p>
                <Form.Item name="negotiationStatus" className="!mb-4">
                  <Select
                    className="!w-full !h-11"
                    options={Object.values(NEGOTIATION_STATUS).map(s => ({ value: s, label: s }))}
                  />
                </Form.Item>
                
                <Form.Item label="Admin / Evaluator Comments" name="comments" className="!mb-0">
                  <TextArea 
                    rows={6} 
                    placeholder="Capture internal negotiation trail, counter-offers, or vendor feedback here..." 
                    className="!rounded-xl"
                  />
                </Form.Item>

                {formValues.negotiationStatus === NEGOTIATION_STATUS.NEGOTIATING && (
                  <Button 
                    block
                    ghost
                    type="primary"
                    className="mb-3 !h-10 !rounded-xl font-bold"
                    onClick={() => negForm.setFieldValue("negotiationStatus", NEGOTIATION_STATUS.AWAITING_APPROVAL)}
                  >
                    Request Manager Approval
                  </Button>
                )}

                {formValues.negotiationStatus === NEGOTIATION_STATUS.AWAITING_APPROVAL && (
                  <div className="mb-4 rounded-xl bg-amber-50 p-4 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Manager Approval Required</p>
                    <Button 
                      block 
                      type="primary" 
                      className="!h-10 !rounded-xl !bg-amber-500 !border-amber-500 font-bold"
                      onClick={() => {
                        negForm.setFieldValue("negotiationStatus", NEGOTIATION_STATUS.APPROVED);
                        message.success("Quotation approved by manager.");
                      }}
                    >
                      Approve Quotation (Simulated)
                    </Button>
                  </div>
                )}

                <Button 
                  type="primary" 
                  icon={formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED ? <CheckCircleOutlined /> : <SaveOutlined />} 
                  block 
                  disabled={
                    formValues.negotiationStatus === NEGOTIATION_STATUS.AWAITING_APPROVAL || 
                    (formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED && !analytics?.canMarkClosed)
                  }
                  className={`mt-6 !h-12 !rounded-2xl !font-bold transition-all ${
                    formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED 
                      ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white disabled:!opacity-50"
                      : "!bg-slate-900 dark:!bg-white dark:!text-slate-950 hover:!opacity-90"
                  }`}
                  onClick={() => {
                    if (formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED) {
                      if (!analytics?.canMarkClosed) {
                        message.warning(`Strict Policy: Margin gap is ₹${analytics.marginGap.toLocaleString()}. Adjust to proceed.`);
                        return;
                      }
                      negForm.setFieldValue("negotiationStatus", NEGOTIATION_STATUS.CLOSED);
                      message.success("Lead marked ready for procurement!");
                    } else {
                      message.success("Negotiation saved successfully!");
                    }
                  }}
                >
                  {formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED 
                    ? `Ready for Procurement ${!analytics?.isMarginPositive ? `(₹-${analytics?.marginGap.toLocaleString()})` : ""}`
                    : "Save Negotiation Progress"}
                </Button>

                {(formValues.negotiationStatus === NEGOTIATION_STATUS.APPROVED && !analytics?.canMarkClosed) && (
                  <div className="mt-4 rounded-xl bg-rose-50 p-3 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                     <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                        <LockOutlined /> Compliance Blocked
                     </p>
                     <p className="mt-1 text-[10px] text-rose-500 font-bold leading-tight">
                        Margin must be positive (Gap: ₹{analytics?.marginGap.toLocaleString()}). Negotiation requires correction.
                     </p>
                  </div>
                )}
              </div>

              {/* Mini Compare Table */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Quotation Ranking
                </p>
                <div className="space-y-3">
                  {(formValues.quotations || [])
                    .filter(q => q.quotedPrice > 0)
                    .sort((a,b) => b.quotedPrice - a.quotedPrice)
                    .map((q, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <Tag color={i === 0 ? "gold" : "default"} className="font-bold border-0 !rounded-md">#{i+1}</Tag>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {q.dealerName || "Unknown"}
                          </span>
                        </div>
                        <span className={`text-xs font-black ${i === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                          ₹{q.quotedPrice.toLocaleString()}
                        </span>
                      </div>
                    ))
                  }
                  {!analytics && (
                    <p className="text-center py-4 text-[11px] text-slate-400 italic">No quotations entered yet.</p>
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
