import React, { useMemo, useState } from "react";
import { Button, Input, InputNumber, Select, Space, Tag } from "antd";
import {
  ArrowRightOutlined,
  EyeOutlined,
  PlusOutlined,
  SignatureOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const PROCUREMENT_STAGES = [
  "Lead Details",
  "Car Details",
  "Inspection Done",
  "Quotes",
  "Inspection Result",
  "Final Negotiation",
  "Receipt of Token from Vendor",
  "Agreement",
  "Payment to Customer",
];

const STAGE_TONE = {
  "Lead Details": "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900/40",
  "Car Details": "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900/40",
  "Inspection Done": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40",
  Quotes: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900/40",
  "Inspection Result": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/40",
  "Final Negotiation": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/20 dark:text-fuchsia-300 dark:border-fuchsia-900/40",
  "Receipt of Token from Vendor": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40",
  Agreement: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/40",
  "Payment to Customer": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
};

const INITIAL_LEADS = [
  {
    id: "UC-PR-2401",
    sellerName: "Rohit Mehra",
    source: "Repeat seller",
    city: "East Delhi",
    phone: "98100 11223",
    stage: "Lead Details",
    stageIndex: 0,
    registrationNo: "",
    makeModel: "",
    askingPrice: 0,
    targetBuyPrice: 0,
    quoteLow: 0,
    quoteHigh: 0,
    inspectionSummary: "",
    negotiationSummary: "",
    tokenAmount: 0,
    paymentReleased: 0,
    lastNote: "Fresh callback due before noon",
  },
  {
    id: "UC-PR-2402",
    sellerName: "Amit Arora",
    source: "Marketplace",
    city: "Gurgaon",
    phone: "98990 44567",
    stage: "Quotes",
    stageIndex: 3,
    registrationNo: "DL8CAF1254",
    makeModel: "2020 Hyundai Venue SX",
    askingPrice: 895000,
    targetBuyPrice: 848000,
    quoteLow: 830000,
    quoteHigh: 858000,
    inspectionSummary: "Single owner, light front bumper paint, tyres 70%",
    negotiationSummary: "Seller wants same-day closure if quote crosses 8.6L",
    tokenAmount: 25000,
    paymentReleased: 0,
    lastNote: "Pricing desk to decide walk-away ceiling",
  },
  {
    id: "UC-PR-2403",
    sellerName: 'Gautam Motors',
    source: "Dealer referral",
    city: "Noida",
    phone: "98111 77889",
    stage: "Agreement",
    stageIndex: 7,
    registrationNo: "UP16DW9012",
    makeModel: "2019 Maruti Baleno Alpha CVT",
    askingPrice: 725000,
    targetBuyPrice: 688000,
    quoteLow: 676000,
    quoteHigh: 695000,
    inspectionSummary: "Good retail candidate, minor bumper touch-up",
    negotiationSummary: "Commercials locked subject to seller payment routing",
    tokenAmount: 50000,
    paymentReleased: 0,
    lastNote: "Agreement pack and third-party mandate pending",
  },
];

function stageCount(leads, stage) {
  return leads.reduce((sum, item) => sum + (item.stage === stage ? 1 : 0), 0);
}

function StageRail({ leads, selectedStage, onSelectStage }) {
  return (
    <div className="space-y-2.5">
      {PROCUREMENT_STAGES.map((stage, index) => {
        const active = selectedStage === stage;
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onSelectStage(stage)}
            className={`w-full rounded-[22px] border px-4 py-3 text-left transition-all ${
              active
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? "text-white/65 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"}`}>
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm font-black tracking-tight">{stage}</p>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                active
                  ? "bg-white/12 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              }`}>
                {stageCount(leads, stage)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LeadCard({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">{item.sellerName}</p>
          <p className={`mt-1 text-xs font-medium ${active ? "text-white/72 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
            {item.source} • {item.city}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
          active
            ? "border-white/20 bg-white/10 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
            : STAGE_TONE[item.stage]
        }`}>
          {item.stage}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>
            Car
          </p>
          <p className="mt-1 text-sm font-semibold">
            {item.makeModel || "Vehicle details pending"}
          </p>
        </div>
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? "text-white/55 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"}`}>
            Ask / target
          </p>
          <p className="mt-1 text-sm font-semibold">
            {item.askingPrice ? `Rs ${item.askingPrice.toLocaleString("en-IN")}` : "-"} /{" "}
            {item.targetBuyPrice ? `Rs ${item.targetBuyPrice.toLocaleString("en-IN")}` : "-"}
          </p>
        </div>
      </div>
      <p className={`mt-4 text-xs font-medium leading-5 ${active ? "text-white/72 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
        {item.lastNote}
      </p>
    </button>
  );
}

function SummaryTile({ label, value, helper }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
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

function DetailField({ label, value, onChange, placeholder, numeric = false }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {numeric ? (
        <InputNumber
          value={value}
          onChange={(next) => onChange(Number(next || 0))}
          className="w-full"
          min={0}
          formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => v?.replace(/[^\d.]/g, "") || ""}
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function UsedCarProcurementStudio() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [selectedStage, setSelectedStage] = useState(PROCUREMENT_STAGES[0]);
  const [selectedLeadId, setSelectedLeadId] = useState(INITIAL_LEADS[0].id);

  const stageLeads = useMemo(
    () => leads.filter((item) => item.stage === selectedStage),
    [leads, selectedStage],
  );

  const selectedLead =
    leads.find((item) => item.id === selectedLeadId) ||
    stageLeads[0] ||
    leads[0];

  const updateLead = (patch) => {
    setLeads((current) =>
      current.map((item) =>
        item.id === selectedLead.id ? { ...item, ...patch } : item,
      ),
    );
  };

  const moveStage = (direction) => {
    const nextIndex = Math.max(
      0,
      Math.min(PROCUREMENT_STAGES.length - 1, selectedLead.stageIndex + direction),
    );
    const nextStage = PROCUREMENT_STAGES[nextIndex];
    updateLead({ stageIndex: nextIndex, stage: nextStage });
    setSelectedStage(nextStage);
  };

  const totals = useMemo(() => {
    const active = leads.reduce((sum, item) => sum + Number(item.targetBuyPrice || 0), 0);
    const negotiated = leads.reduce((sum, item) => sum + Number(item.quoteHigh || 0), 0);
    return { active, negotiated };
  }, [leads]);

  return (
    <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-4">
        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Procurement desk
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                Lead intake and progression studio
              </h3>
            </div>
            <Button icon={<PlusOutlined />}>Add Lead</Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryTile
              label="Active buy-side value"
              value={`Rs ${totals.active.toLocaleString("en-IN")}`}
              helper="Current target buy spread across live leads"
            />
            <SummaryTile
              label="Quote ceiling"
              value={`Rs ${totals.negotiated.toLocaleString("en-IN")}`}
              helper="Combined upper quote envelope"
            />
          </div>

          <div className="mt-5">
            <StageRail
              leads={leads}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Stage queue
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {selectedStage}
              </h3>
            </div>
            <Tag className="!m-0 rounded-full !px-3 !py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
              {stageLeads.length} live
            </Tag>
          </div>
          <div className="mt-4 space-y-3">
            {stageLeads.length ? (
              stageLeads.map((item) => (
                <LeadCard
                  key={item.id}
                  item={item}
                  active={selectedLead?.id === item.id}
                  onClick={() => setSelectedLeadId(item.id)}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
                No live leads in this stage yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0e1014] md:p-5 xl:p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Lead inspector
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {selectedLead?.sellerName || "Select a lead"}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {selectedLead?.id} • {selectedLead?.phone} • {selectedLead?.source}
            </p>
          </div>

          <Space wrap>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setSelectedStage(selectedLead.stage)}
            >
              Focus Stage
            </Button>
            <Button
              icon={<SignatureOutlined />}
              onClick={() => navigate("/used-cars/procurement/agreement")}
            >
              Open Agreement
            </Button>
            <Button onClick={() => moveStage(-1)}>Move Back</Button>
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => moveStage(1)}>
              Move Ahead
            </Button>
          </Space>
        </div>

        {selectedLead ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryTile
                label="Current stage"
                value={selectedLead.stage}
                helper={`Step ${String(selectedLead.stageIndex + 1).padStart(2, "0")} of ${PROCUREMENT_STAGES.length}`}
              />
              <SummaryTile
                label="Ask"
                value={selectedLead.askingPrice ? `Rs ${selectedLead.askingPrice.toLocaleString("en-IN")}` : "-"}
                helper="Seller side anchor"
              />
              <SummaryTile
                label="Target buy"
                value={selectedLead.targetBuyPrice ? `Rs ${selectedLead.targetBuyPrice.toLocaleString("en-IN")}` : "-"}
                helper="Internal ceiling"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Lead Details
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DetailField label="Seller name" value={selectedLead.sellerName} onChange={(value) => updateLead({ sellerName: value })} />
                  <DetailField label="Phone" value={selectedLead.phone} onChange={(value) => updateLead({ phone: value })} />
                  <DetailField label="Source" value={selectedLead.source} onChange={(value) => updateLead({ source: value })} />
                  <DetailField label="City" value={selectedLead.city} onChange={(value) => updateLead({ city: value })} />
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Car Details
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DetailField label="Registration" value={selectedLead.registrationNo} onChange={(value) => updateLead({ registrationNo: value })} />
                  <DetailField label="Make / model" value={selectedLead.makeModel} onChange={(value) => updateLead({ makeModel: value })} />
                  <DetailField label="Asking price" value={selectedLead.askingPrice} onChange={(value) => updateLead({ askingPrice: value })} numeric />
                  <DetailField label="Target buy price" value={selectedLead.targetBuyPrice} onChange={(value) => updateLead({ targetBuyPrice: value })} numeric />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Inspection and quotes
                </p>
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Inspection summary
                    </p>
                    <Input.TextArea
                      rows={4}
                      value={selectedLead.inspectionSummary}
                      onChange={(e) => updateLead({ inspectionSummary: e.target.value })}
                      placeholder="Condition notes, accident history, tyres, panels, ownership observations"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label="Quote low" value={selectedLead.quoteLow} onChange={(value) => updateLead({ quoteLow: value })} numeric />
                    <DetailField label="Quote high" value={selectedLead.quoteHigh} onChange={(value) => updateLead({ quoteHigh: value })} numeric />
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Negotiation and closure
                </p>
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Negotiation note
                    </p>
                    <Input.TextArea
                      rows={4}
                      value={selectedLead.negotiationSummary}
                      onChange={(e) => updateLead({ negotiationSummary: e.target.value })}
                      placeholder="Seller flexibility, objections, dependencies, approval note"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label="Token received" value={selectedLead.tokenAmount} onChange={(value) => updateLead({ tokenAmount: value })} numeric />
                    <DetailField label="Payment released" value={selectedLead.paymentReleased} onChange={(value) => updateLead({ paymentReleased: value })} numeric />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#11151b]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Stage path
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Move the case from intake to agreement and seller payment without leaving the procurement desk.
                  </p>
                </div>
                <Select
                  value={selectedLead.stage}
                  onChange={(stage) => {
                    const stageIndex = PROCUREMENT_STAGES.indexOf(stage);
                    updateLead({ stage, stageIndex });
                    setSelectedStage(stage);
                  }}
                  options={PROCUREMENT_STAGES.map((value) => ({ value, label: value }))}
                  className="min-w-[260px]"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PROCUREMENT_STAGES.map((stage, index) => (
                  <div
                    key={stage}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      index <= selectedLead.stageIndex
                        ? STAGE_TONE[stage]
                        : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-transparent dark:text-slate-500"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")} {stage}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
