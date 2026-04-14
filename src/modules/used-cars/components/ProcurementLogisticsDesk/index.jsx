import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  message,
  Tag,
  DatePicker,
  Checkbox,
  InputNumber,
  Steps,
  Divider,
  Radio,
  Row,
  Col,
} from "antd";
import {
  TruckOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  IdcardOutlined,
  KeyOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  SaveOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  PlusOutlined,
  DollarOutlined,
  CheckCircleFilled,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  PROCUREMENT_STORAGE_KEY,
  MOCK_PROCUREMENT_LEADS,
  PROCUREMENT_STATUS,
  LOGISTICS_DRIVERS,
  getDefaultProcurementValues,
  PAYMENT_TYPE_OPTS,
} from "./constants";
import { DOCUMENTATION_STORAGE_KEY } from "../DocumentationDesk/constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

// ── Metrics Dashboard ─────────────────────────────────────────────
function ProcurementMetricCard({ title, value, subValue, icon, colorClass, activeCount }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{title}</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{value}</p>
            {activeCount !== undefined && (
              <Tag color={activeCount > 0 ? "processing" : "default"} className="font-bold border-0 !rounded-md m-0 lowercase tracking-tighter">
                {activeCount} active
              </Tag>
            )}
          </div>
        </div>
      </div>
      {subValue && (
        <div className="mt-3 border-t border-slate-100 pt-2 dark:border-white/5">
          <p className="text-[10px] font-medium text-slate-500">{subValue}</p>
        </div>
      )}
    </div>
  );
}

// ── Lead Card ────────────────────────────────────────────────────
function ProcurementQueueCard({ lead, active, onClick }) {
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
            {lead.make} {lead.model}
          </p>
          <p className={`mt-0.5 text-[11px] font-bold ${active ? "text-white/70 dark:text-slate-500" : "text-slate-500"}`}>
            {lead.pickupLocation}
          </p>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black truncate lowercase tracking-tighter ${active ? "bg-white/10 dark:bg-slate-950/20" : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"}`}>
            {lead.negotiationStatus}
          </div>
          <p className="mt-2 text-xs font-black">₹{(lead.finalPrice / 100000).toFixed(2)}L</p>
        </div>
      </div>
    </button>
  );
}

export default function ProcurementLogisticsDesk() {
  const [procForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(MOCK_PROCUREMENT_LEADS[0].id);
  const [search, setSearch] = useState("");
  
  const formValues = Form.useWatch([], procForm) || getDefaultProcurementValues();

  const selectedLead = useMemo(() => 
    MOCK_PROCUREMENT_LEADS.find(l => l.id === selectedId),
    [selectedId]
  );

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase();
    return MOCK_PROCUREMENT_LEADS.filter(l => 
      l.regNo?.toLowerCase().includes(s) || 
      l.name?.toLowerCase().includes(s)
    );
  }, [search]);

  // Persistence logic 
  useEffect(() => {
    const saved = localStorage.getItem(`${PROCUREMENT_STORAGE_KEY}_${selectedId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      procForm.setFieldsValue({
        ...getDefaultProcurementValues(),
        ...parsed,
        logistics: {
          ...parsed.logistics,
          pickupTime: parsed.logistics?.pickupTime ? dayjs(parsed.logistics.pickupTime) : null
        }
      });
    } else {
      procForm.resetFields();
      procForm.setFieldsValue(getDefaultProcurementValues());
    }
  }, [selectedId, procForm]);

  const handleValuesChange = useCallback((changed, allValues) => {
    localStorage.setItem(`${PROCUREMENT_STORAGE_KEY}_${selectedId}`, JSON.stringify(allValues));
  }, [selectedId]);

  // Sync Finance Data from Documentation Stage (Stage 5)
  const docFinance = useMemo(() => {
    const saved = localStorage.getItem(`${DOCUMENTATION_STORAGE_KEY}_${selectedId}`);
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
    return (formValues.payment?.records || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  }, [formValues.payment?.records]);

  const isMatched = Math.abs(totalPaid - docFinance.net) < 1;

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <style>{`
        .finance-input .ant-input-number { width: 100% !important; border-radius: 12px !important; height: 40px !important; display: flex; align-items: center; }
        .finance-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .finance-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -10px rgba(0,0,0,0.05); }
        .payment-row { transition: all 0.2s; }
        .payment-row:hover { border-color: #6366f1 !important; background: rgba(99, 102, 241, 0.02); }
      `}</style>
      
      {/* ── Left Sidebar: Procurement Pipeline ────────────────────── */}
      <div className="xl:w-[320px] flex-none">
        <div className="sticky top-6 flex h-[calc(100vh-280px)] flex-col gap-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Procurement Pipeline
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
          
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
            {filteredLeads.map(lead => (
              <ProcurementQueueCard 
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
          form={procForm}
          layout="vertical"
          onValuesChange={handleValuesChange}
          requiredMark={false}
          className="finance-input"
        >
          {/* Metrics Overview */}
          <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <ProcurementMetricCard 
              title="Daily Pickups"
              value="08"
              activeCount={2}
              icon={<TruckOutlined className="text-xl" />}
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              subValue="Next slot: 4:30 PM"
            />
            <ProcurementMetricCard 
              title="Docs Accuracy"
              value="98.5%"
              icon={<FileTextOutlined className="text-xl" />}
              colorClass="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
              subValue="Audit passed for 42 units"
            />
            <ProcurementMetricCard 
              title="Matching Dues"
              value={`₹${(totalPaid/100000).toFixed(1)}L`}
              icon={<CreditCardOutlined className="text-xl" />}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              subValue={`${(docFinance.net/100000).toFixed(1)}L Total Target`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* ── Executive Hub ── */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <UserOutlined />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Logistics Hub</p>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Executive Assignment</h2>
                    </div>
                  </div>
                  {isMatched && (
                    <Tag color="success" className="!rounded-md border-0 bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest px-3 py-1">Verified Payout</Tag>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Form.Item label="Assign Executive" name={["logistics", "executiveId"]}>
                    <Select 
                      placeholder="Select executive..."
                      className="!h-11 !rounded-xl"
                      options={LOGISTICS_DRIVERS.map(d => ({ 
                        value: d.id, 
                        label: d.name
                      }))}
                    />
                  </Form.Item>
                  <Form.Item label="Pickup Time" name={["logistics", "pickupTime"]}>
                    <DatePicker showTime className="!w-full !h-11 !rounded-xl" placeholder="Select slot..." />
                  </Form.Item>
                  <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Documents Signed</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Verify if all physical agreements are executed on ground.</p>
                    </div>
                    <Form.Item name={["logistics", "docsSigned"]} noStyle>
                      <Radio.Group buttonStyle="solid">
                         <Radio.Button value="Yes" className="!rounded-l-xl">Yes</Radio.Button>
                         <Radio.Button value="No" className="!rounded-r-xl">No</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </div>
                </div>
              </div>

              {/* ── Asset Collection Checklist ── */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <SafetyCertificateOutlined />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500">Asset Management</p>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Physical Handoff Verification</h2>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Documents Verification</p>
                       <Tag color={selectedLead?.ownershipType === "Company" ? "purple" : "sky"} className="font-bold border-0 !rounded-md uppercase text-[9px] tracking-widest">
                          {selectedLead?.ownershipType || "Individual"} Case
                       </Tag>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                       {(selectedLead?.ownershipType === "Company" ? [
                           { label: "GST Certificate", key: "gst" },
                           { label: "Company PAN Card", key: "panCompany" },
                           { label: "Sale Letter", key: "saleLetter" },
                           { label: "Authority Letter (Signatory)", key: "authorityLetter" },
                           { label: "2 Letterheads", key: "letterheads" },
                           { label: "RC Original", key: "rc" },
                           { label: "Insurance Policy", key: "insurance" },
                           { label: "2nd Key", key: "secondKey" },
                           { label: "PAN of Signing Authority", key: "signingAuthorityPan" },
                           { label: "Aadhaar of Signing Authority", key: "signingAuthorityAadhaar" },
                           { label: "Service Book", key: "serviceBook" }
                         ] : [
                           { label: "PAN Card", key: "pan" },
                           { label: "Sale Letter", key: "saleLetter" },
                           { label: "RC Original", key: "rc" },
                           { label: "Insurance Policy", key: "insurance" },
                           { label: "2nd Key", key: "secondKey" },
                           { label: "Service Book", key: "serviceBook" }
                         ]).map(item => (
                         <Form.Item 
                           key={item.key} 
                           name={["assets", "handoffChecklist", item.key]} 
                           valuePropName="checked" 
                           className="!mb-0"
                         >
                           <div className={`flex items-center justify-between p-3.5 rounded-[18px] border transition-all ${
                             formValues.assets?.handoffChecklist?.[item.key] 
                              ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20" 
                              : "bg-slate-50 border-slate-100 dark:bg-white/0 dark:border-white/5"
                           }`}>
                              <div className="flex items-center gap-3">
                                 <div className={`h-1.5 w-1.5 rounded-full ${formValues.assets?.handoffChecklist?.[item.key] ? "bg-emerald-500" : "bg-slate-300"}`} />
                                 <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                              </div>
                              <Checkbox />
                           </div>
                         </Form.Item>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Spares</p>
                     <div className="p-5 rounded-[22px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-5">
                       <Form.Item label="Original Keys Count" name={["assets", "originalKeys"]} className="!mb-0">
                          <Radio.Group className="flex gap-2">
                            {[0, 1, 2].map(n => (
                              <Radio.Button key={n} value={n} className="!w-10 !h-10 !flex !items-center !justify-center !rounded-xl font-black">{n}</Radio.Button>
                            ))}
                          </Radio.Group>
                       </Form.Item>
                       <Form.Item label="Spare Tyre State" name={["assets", "spareTyreState"]} className="!mb-0">
                          <Select 
                            className="!rounded-xl"
                            options={[
                              { value: "present", label: "Present & Balanced" },
                              { value: "missing", label: "Missing" },
                              { value: "damaged", label: "Damaged / Unusable" },
                            ]}
                          />
                       </Form.Item>
                       <Form.Item name={["assets", "ownersManual"]} valuePropName="checked" noStyle>
                          <Checkbox className="text-xs font-bold text-slate-600 dark:text-slate-300">
                             Owners Manual Receipt
                          </Checkbox>
                       </Form.Item>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column: Payout Hub & Ledger ── */}
            <div className="space-y-6">
              {/* Financial Snapshot (Stage 5 Sync) */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                 <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                       <DollarOutlined />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Finance Summary</p>
                       <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{selectedLead?.regNo}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-500 font-medium">Vehicle Price</span>
                       <span className="font-black text-slate-900 dark:text-slate-100">₹{docFinance.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-500 font-medium">Deduction / Fees</span>
                       <span className="font-black text-rose-500">- ₹{docFinance.fees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-500 font-medium">Holdback Amount</span>
                       <span className="font-black text-amber-500">- ₹{docFinance.holdback.toLocaleString()}</span>
                    </div>
                    <Divider className="!my-2 border-slate-100 dark:border-white/5" />
                    <div className="flex justify-between items-center rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Net Payable</span>
                       <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">₹{docFinance.net.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Multi-Payment Ledger (Refactored to Form.List for reliability) */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-white/[0.03] overflow-hidden">
                 <Form.List name={["payment", "records"]}>
                    {(fields, { add, remove }) => (
                      <>
                        <div className="p-6 pb-2">
                           <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 active:scale-95 transition-all">
                                    <CreditCardOutlined />
                                 </div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Ledger</p>
                              </div>
                              <Button 
                                type="text" 
                                size="small" 
                                icon={<PlusOutlined />} 
                                className="!text-indigo-600 font-black uppercase text-[10px] tracking-tight"
                                onClick={() => add({ id: Date.now(), amount: 0, type: "Balance Payment", utn: "", date: dayjs().toISOString() })}
                              >
                                Add Record
                              </Button>
                           </div>

                           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                              {fields.map(({ key, name, ...restField }) => (
                                <div key={key} className="payment-row relative rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                                   <Button 
                                     type="text" 
                                     danger 
                                     size="small"
                                     className="absolute right-2 top-2 !h-6 !w-6 !p-0 !flex !items-center !justify-center !rounded-full opacity-40 hover:opacity-100"
                                     onClick={() => remove(name)}
                                   >
                                     <DeleteOutlined className="text-xs" />
                                   </Button>
                                   <Row gutter={[12, 12]}>
                                      <Col span={14}>
                                         <Form.Item {...restField} name={[name, "type"]} label={<span className="text-[10px] font-bold text-slate-400">Type</span>} className="!mb-0" colon={false}>
                                            <Select size="small" options={PAYMENT_TYPE_OPTS} className="!text-[10px] font-bold" />
                                         </Form.Item>
                                      </Col>
                                      <Col span={10}>
                                         <Form.Item {...restField} name={[name, "amount"]} label={<span className="text-[10px] font-bold text-slate-400">Amount</span>} className="!mb-0" colon={false}>
                                            <InputNumber size="small" className="font-black !text-indigo-600" />
                                         </Form.Item>
                                      </Col>
                                      <Col span={24}>
                                         <Form.Item {...restField} name={[name, "utn"]} label={<span className="text-[10px] font-bold text-slate-400">UTN / Reference</span>} className="!mb-0" colon={false}>
                                            <Input size="small" placeholder="Ref#" className="!text-[10px] uppercase font-medium" />
                                         </Form.Item>
                                      </Col>
                                   </Row>
                                </div>
                              ))}
                              {fields.length === 0 && (
                                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 dark:bg-white/0 dark:border-white/5">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">No Payments Recorded</p>
                                   <Button type="link" onClick={() => add({ id: Date.now(), amount: 0, type: "Balance Payment", utn: "", date: dayjs().toISOString() })} className="!text-[10px] !p-0 font-black">Record First Payment</Button>
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Matching Indicator */}
                        <div className={`mt-4 p-5 text-center transition-all ${isMatched ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5"}`}>
                           <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${isMatched ? "text-white/80" : "text-slate-500"}`}>Matched Total</span>
                              <span className={`text-sm font-black ${isMatched ? "text-white" : "text-slate-900 dark:text-slate-200"}`}>₹{totalPaid.toLocaleString()}</span>
                           </div>
                           {isMatched ? (
                             <div className="flex items-center justify-center gap-2 mt-1">
                               <CheckCircleOutlined />
                               <span className="text-[11px] font-black uppercase">Payout Verified & Completed</span>
                             </div>
                           ) : (
                             <div className="flex items-center justify-between mt-1">
                                <span className="text-[9px] font-bold text-rose-500 uppercase">Due: ₹{(docFinance.net - totalPaid).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase italic">Pending Total Match</span>
                             </div>
                           )}
                        </div>
                      </>
                    )}
                 </Form.List>
              </div>

              {/* Completion Action */}
              <div className="pt-2">
                 <Button 
                  type="primary" 
                  block 
                  size="large"
                  disabled={!isMatched || formValues.logistics?.docsSigned !== "Yes"}
                  className={`!h-14 !rounded-[22px] !font-black !text-base shadow-xl transition-all ${
                    isMatched 
                      ? "!bg-slate-950 !border-slate-950 dark:!bg-white dark:!text-slate-950" 
                      : "!bg-slate-200 !text-slate-400 !border-slate-200 dark:!bg-white/5 dark:!text-slate-600"
                  }`}
                  onClick={() => message.success("Vehicle officially onboarded to ACILLP Inventory!")}
                 >
                   Onboard to Yard Inventory
                 </Button>
                 <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
                    Accessible only after Payout Verification & Doc Signing.
                 </p>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
