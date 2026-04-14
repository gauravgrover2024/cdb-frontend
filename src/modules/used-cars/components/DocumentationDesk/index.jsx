import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Radio,
  Checkbox,
  Upload,
  message,
  Divider,
  Tag,
  Row,
  Col,
  Empty,
  Tabs,
  InputNumber,
  DatePicker,
  TimePicker,
  Result,
} from "antd";
import {
  FileProtectOutlined,
  UserOutlined,
  BankOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleFilled,
  WarningFilled,
  PaperClipOutlined,
  IdcardOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  FieldTimeOutlined,
  TeamOutlined,
  ToolOutlined,
  SearchOutlined,
  EditOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import {
  DOCUMENTATION_STORAGE_KEY,
  VEHICLE_CATEGORY_OPTS,
  OWNERSHIP_TYPE_OPTS,
  INSURANCE_TYPE_OPTS,
  RC_TYPE_OPTS,
  PROCUREMENT_CATEGORY_OPTS,
  ADDITIONAL_SERVICE_OPTS,
  HOLDBACK_CONDITION_OPTS,
  getDefaultDocValues,
} from "./constants";
import { BGC_STORAGE_KEY } from "../BackgroundCheckDesk/constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";
import AgreementPreview from "./AgreementPreview";

const { TextArea } = Input;

// ── Lead Card ────────────────────────────────────────────────────
function DocQueueCard({ lead, active, onClick, verified }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[22px] border p-3.5 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:bg-white/0 dark:text-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-white/50" : "text-slate-400"}`}>
            {lead.regNo}
          </p>
          <p className="mt-1 text-sm font-black leading-tight truncate">
            {lead.name}
          </p>
        </div>
        <div className="text-right">
           {verified ? (
             <Tag color="success" className="!rounded-md border-0 m-0 !text-[8px] font-black uppercase tracking-tighter bg-emerald-500 text-white">
               Verified
             </Tag>
           ) : (
             <Tag color="cyan" className="!rounded-md border-0 m-0 !text-[8px] font-black uppercase tracking-tighter">
               Pending
             </Tag>
           )}
        </div>
      </div>
    </button>
  );
}

// ── Document Upload Slot ─────────────────────────────────────────
function DocUploadSlot({ label, icon, uploaded, onUpload, disabled }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
      uploaded 
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5" 
        : "border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-transparent"
    }`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
        uploaded ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400 dark:bg-white/5"
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-black text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-[10px] font-medium text-slate-500">Only JPG / PDF · Max 5MB</p>
      </div>
      {!disabled && (
        <Upload showUploadList={false} beforeUpload={() => { onUpload(); return false; }}>
          <Button size="small" className="!rounded-lg !text-[10px] font-black uppercase tracking-tight">
            {uploaded ? "Replace" : "Upload"}
          </Button>
        </Upload>
      )}
    </div>
  );
}

// ── Main Desk ────────────────────────────────────────────────────
export default function DocumentationDesk() {
  const [docForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const leads = useMemo(() => {
    const raw = localStorage.getItem(BGC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }, []);

  useEffect(() => {
    if (leads.length > 0 && !selectedId) setSelectedId(leads[0].id);
  }, [leads, selectedId]);

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedId), [leads, selectedId]);

  const formValues = Form.useWatch([], docForm) || getDefaultDocValues();

  // Sync Challans from BGC Data
  const challanInfo = useMemo(() => {
    const bgcData = selectedLead?.bgcData || {};
    const total = (bgcData.echallanAmount || 0) + (bgcData.dtpAmount || 0);
    return {
      hasPending: bgcData.challanPending === "Yes",
      amount: total,
    };
  }, [selectedLead]);

  // Load Lead-specific verification statuses
  const leadStatuses = useMemo(() => {
    const statuses = {};
    leads.forEach(l => {
      const saved = localStorage.getItem(`${DOCUMENTATION_STORAGE_KEY}_${l.id}`);
      if (saved) statuses[l.id] = JSON.parse(saved).isVerified;
    });
    return statuses;
  }, [leads, selectedId, formValues.isVerified]);

  // Persistence
  useEffect(() => {
    if (!selectedId) return;
    const saved = localStorage.getItem(`${DOCUMENTATION_STORAGE_KEY}_${selectedId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.agreementDate) parsed.agreementDate = dayjs(parsed.agreementDate);
      if (parsed.deliveryTime) parsed.deliveryTime = dayjs(parsed.deliveryTime);
      docForm.setFieldsValue(parsed);
      if (parsed.isVerified) setActiveTab("agreement_hub");
    } else {
      docForm.resetFields();
      docForm.setFieldsValue(getDefaultDocValues(selectedLead));
      setActiveTab("profile");
    }
  }, [selectedId, docForm, selectedLead]);

  const handleValuesChange = useCallback((changed, allValues) => {
    localStorage.setItem(`${DOCUMENTATION_STORAGE_KEY}_${selectedId}`, JSON.stringify(allValues));
  }, [selectedId]);

  const handleFinalize = () => {
    docForm.setFieldValue("isVerified", true);
    handleValuesChange(null, docForm.getFieldsValue());
    setActiveTab("agreement_hub");
    message.success("Documentation verified! Agreement Builder unlocked.");
  };

  const handleUnlock = () => {
    docForm.setFieldValue("isVerified", false);
    handleValuesChange(null, docForm.getFieldsValue());
    setActiveTab("profile");
    message.info("Documentation unlocked for editing.");
  };

  const filteredLeads = useMemo(() => {
    const s = search.toLowerCase();
    return leads.filter(l => l.regNo.toLowerCase().includes(s) || (l.name || "").toLowerCase().includes(s));
  }, [leads, search]);

  if (!selectedId) return <div className="p-10 text-center"><Empty description="No documents pending..." /></div>;

  const docTabs = [
    {
      key: "profile",
      label: <span className="flex items-center gap-2"><UserOutlined /> Identity & Vehicle</span>,
      children: (
        <div className="space-y-6">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
             <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">Legal Identity</p>
             <Row gutter={[20, 20]}>
               <Col span={12}><Form.Item label="Owner Full Name" name="customerName"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={12}><Form.Item label="Father's / Spouse Name" name="fathersName" required><Input className="!h-11" placeholder="As per PAN/Aadhaar" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={12}><Form.Item label="Contact No." name="contactNo"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={12}><Form.Item label="Email ID" name="emailId"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={24}><Form.Item label="Full Permanent Address" name="address" required><TextArea rows={3} disabled={formValues.isVerified} /></Form.Item></Col>
             </Row>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
             <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">Vehicle Technical Profile</p>
             <Row gutter={[20, 20]}>
               <Col span={8}><Form.Item label="Reg No" name="regNo"><Input className="!h-11" disabled /></Form.Item></Col>
               <Col span={8}><Form.Item label="Engine No" name="engineNo" required><Input className="!h-11" placeholder="Enter full Engine No" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Chassis No" name="chassisNo" required><Input className="!h-11" placeholder="Enter full Chassis No" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Make" name="make"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Model" name="model"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Mfg Year" name="mfgYear"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Ownership Serial" name="ownershipSerial"><Select options={OWNERSHIP_TYPE_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Odometer Reading (KM)" name="odometer" required><InputNumber className="!w-full !h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Vehicle Category" name="vehicleCategory"><Select options={VEHICLE_CATEGORY_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Ownership Type" name="ownershipType"><Select options={OWNERSHIP_TYPE_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Insurance Type" name="insuranceType"><Select options={INSURANCE_TYPE_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="RC Type" name="rcType"><Select options={RC_TYPE_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
               <Col span={8}><Form.Item label="Procurement Category" name="procurementCategory"><Select options={PROCUREMENT_CATEGORY_OPTS.map(v => ({ value: v, label: v }))} className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
             </Row>
          </div>
        </div>
      )
    },
    {
      key: "financials",
      label: <span className="flex items-center gap-2"><DollarOutlined /> Pricing & Holdbacks</span>,
      children: (
        <div className="space-y-6">
           <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
             <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">Deal Structure</p>
             <Row gutter={[20, 20]}>
                <Col span={8}><Form.Item label="Vehicle Price (INR)" name="vehiclePrice"><InputNumber disabled={formValues.isVerified} className="!w-full !h-11 font-black" formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} /></Form.Item></Col>
                <Col span={8}><Form.Item label="Deduction / Fees (INR)" name="feesByUser"><InputNumber disabled={formValues.isVerified} className="!w-full !h-11" /></Form.Item></Col>
                <Col span={8}><Form.Item label="Holdback Amount (INR)" name="holdbackAmount"><InputNumber disabled={formValues.isVerified} className="!w-full !h-11" /></Form.Item></Col>
                <Col span={12}><Form.Item label="Holdback Condition" name="holdbackCondition"><Select mode="multiple" disabled={formValues.isVerified} options={HOLDBACK_CONDITION_OPTS.map(v => ({ value: v, label: v }))} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Permitted Holdback Days" name="holdbackDays"><InputNumber disabled={formValues.isVerified} className="!w-full !h-11" /></Form.Item></Col>
                <Col span={24}><Form.Item label="Additional Services" name="additionalServices"><Checkbox.Group options={ADDITIONAL_SERVICE_OPTS} disabled={formValues.isVerified} /></Form.Item></Col>
             </Row>
           </div>
        </div>
      )
    },
    {
      key: "bank",
      label: <span className="flex items-center gap-2"><BankOutlined /> Bank & KYC</span>,
      children: (
        <div className="space-y-6">
           <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Receiver Bank Account</p>
              <Row gutter={[20, 20]}>
                 <Col span={12}><Form.Item label="Account Holder Name" name="accHolderName"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                 <Col span={12}><Form.Item label="Account No." name="accountNo"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                 <Col span={12}><Form.Item label="Bank Name" name="bankName"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                 <Col span={12}><Form.Item label="IFSC Code" name="ifsc"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
              </Row>
           </div>
           
           <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Hypothecation / Loan Closure</p>
                <Form.Item name="hypothecation" noStyle>
                   <Radio.Group buttonStyle="solid" disabled={formValues.isVerified}>
                      <Radio.Button value="Yes">Yes</Radio.Button>
                      <Radio.Button value="No">No</Radio.Button>
                   </Radio.Group>
                </Form.Item>
              </div>
              
              {formValues.hypothecation === "Yes" && (
                <div className="space-y-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <Row gutter={[20, 20]}>
                     <Col span={12}><Form.Item label="Bank Name" name="financerName"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                     <Col span={12}><Form.Item label="Loan Status" name="loanStatus"><Select disabled={formValues.isVerified} options={[{value: "Paid", label: "Paid"}, {value: "Open", label: "Open"}]} className="!h-11" /></Form.Item></Col>
                     <Col span={12}><Form.Item label="Linked Loan?" name="linkedLoan"><Radio.Group disabled={formValues.isVerified} size="small"><Radio value="Yes">Yes</Radio><Radio value="No">No</Radio></Radio.Group></Form.Item></Col>
                     {formValues.linkedLoan === "Yes" && (
                       <Col span={12}><Form.Item label="Linked Loan Status" name="linkedLoanStatus"><Select disabled={formValues.isVerified} options={[{value: "Paid", label: "Paid"}, {value: "Open", label: "Open"}]} className="!h-11" /></Form.Item></Col>
                     )}
                     <Col span={12}><Form.Item label="Loan Account No" name="loanAccountNo"><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                     <Col span={12}><Form.Item label="Foreclosure Amount (INR)" name="foreclosureAmount"><InputNumber className="!w-full !h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                  </Row>
                </div>
              )}
           </div>

           <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">BGC Challan Verification</p>
                {challanInfo.hasPending && <Tag color="error" className="font-bold border-0 !rounded-md">LIABILITY DETECTED</Tag>}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 p-4 dark:bg-rose-500/5">
                 <div>
                    <h4 className="text-xs font-black text-rose-900 dark:text-rose-300">Total Pending Dues</h4>
                    <p className="text-[10px] text-rose-500">Auto-synced from Stage 3 (BGC)</p>
                 </div>
                 <p className="text-xl font-black text-rose-600">₹{challanInfo.amount.toLocaleString()}</p>
              </div>
           </div>
           
           <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">KYC Verification Hub</p>
              <div className="space-y-3">
                 <Row gutter={16}>
                    <Col span={12}><Form.Item label="PAN Card No" name="panNo" required><Input className="!h-11 uppercase" disabled={formValues.isVerified} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="Aadhaar Card No" name="aadhaarNo" required><Input className="!h-11" disabled={formValues.isVerified} /></Form.Item></Col>
                 </Row>
                 <DocUploadSlot label="Self Attested PAN Copy" icon={<IdcardOutlined />} uploaded={formValues.panAttested} disabled={formValues.isVerified} onUpload={() => { docForm.setFieldValue("panAttested", true); handleValuesChange(null, docForm.getFieldsValue()); }} />
                 <DocUploadSlot label="Self Attested Aadhaar Copy" icon={<IdcardOutlined />} uploaded={formValues.aadhaarAttested} disabled={formValues.isVerified} onUpload={() => { docForm.setFieldValue("aadhaarAttested", true); handleValuesChange(null, docForm.getFieldsValue()); }} />
                 <DocUploadSlot label="Customer Photo" icon={<UserOutlined />} uploaded={formValues.photoUploaded} disabled={formValues.isVerified} onUpload={() => { docForm.setFieldValue("photoUploaded", true); handleValuesChange(null, docForm.getFieldsValue()); }} />
                 
                 <Divider className="!my-2" />
                 
                 <Form.Item label="GST Number (Optional)" name="gstNumber"><Input className="!h-11" placeholder="GSTIN..." disabled={formValues.isVerified} /></Form.Item>
                 <DocUploadSlot label="GST Certificate" icon={<FileProtectOutlined />} uploaded={formValues.gstUploaded} disabled={formValues.isVerified} onUpload={() => { docForm.setFieldValue("gstUploaded", true); handleValuesChange(null, docForm.getFieldsValue()); }} />
                 
                 <Form.Item label="Is this a Death Case?" name="isDeathCase" className="!mt-4">
                    <Radio.Group buttonStyle="solid" disabled={formValues.isVerified}>
                       <Radio.Button value="Yes">Yes</Radio.Button>
                       <Radio.Button value="No">No</Radio.Button>
                    </Radio.Group>
                 </Form.Item>
              </div>
           </div>

           {!formValues.isVerified && (
             <div className="flex justify-end pt-4">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ArrowRightOutlined />} 
                  className="!h-14 !rounded-[22px] !bg-slate-900 !border-slate-900 font-black px-10 shadow-xl"
                  onClick={handleFinalize}
                >
                  Finalize Documentation & Unlock Agreement
                </Button>
             </div>
           )}
        </div>
      )
    }
  ];

  const agreementTab = {
    key: "agreement_hub",
    label: <span className="flex items-center gap-2"><SafetyCertificateOutlined /> Agreement Builder Hub</span>,
    children: (
      <div className="space-y-6">
         <Result
           status="success"
           title={<span className="text-2xl font-black text-slate-900">Documentation Verified</span>}
           subTitle="All 29 fields have been captured and verified. You can now generate the legal purchase contract."
           extra={[
             <Button key="edit" icon={<EditOutlined />} onClick={handleUnlock} className="!h-11 !rounded-xl font-bold">Edit Records</Button>,
           ]}
           className="bg-white rounded-[32px] border border-slate-100 shadow-sm mb-6"
         />

         <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
               <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Contract Metadata</p>
               <Row gutter={[20, 20]}>
                  <Col span={24}><Form.Item label="Agreement Execution Date" name="agreementDate"><DatePicker className="!w-full !h-11" format="DD MMM YYYY" /></Form.Item></Col>
                  <Col span={24}><Form.Item label="Handoff / Delivery Time" name="deliveryTime"><TimePicker className="!w-full !h-11" format="HH:mm" /></Form.Item></Col>
               </Row>
            </div>

            <div className="rounded-[32px] bg-indigo-900 p-8 text-white shadow-2xl flex flex-col justify-center items-center text-center">
               <div className="h-20 w-20 bg-white/10 rounded-[28px] flex items-center justify-center mb-6 backdrop-blur">
                  <FileTextOutlined className="text-4xl text-sky-400" />
               </div>
               <h3 className="text-xl font-black">Contract Engine Ready</h3>
               <p className="mt-2 text-xs text-white/60 leading-relaxed font-medium mb-8">
                  The agreement will automatically fetch all {formValues.customerName ? `records for ${formValues.customerName}` : "available records"}.
               </p>
               <Button 
                 type="primary" 
                 size="large" 
                 icon={<PrinterOutlined />}
                 className="!h-14 !w-full !rounded-2xl !bg-white !text-indigo-950 !border-white font-black hover:!scale-105 transition-all"
                 onClick={() => setShowPreview(true)}
               >
                 Generate & Print Agreement
               </Button>
            </div>
         </div>
      </div>
    )
  };

  const finalTabs = formValues.isVerified ? [agreementTab, ...docTabs] : docTabs;

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <style>{`
        .doc-input .ant-tabs-nav::before { border-bottom: none !important; }
        .doc-input .ant-tabs-tab { padding: 12px 20px !important; border-radius: 12px !important; transition: all 0.2s; }
        .doc-input .ant-tabs-tab-active { background: rgba(0,0,0,0.03) !important; font-weight: 800; }
        .dark .doc-input .ant-tabs-tab-active { background: rgba(255,255,255,0.05) !important; }
        .doc-input .ant-tabs-ink-bar { display: none; }
      `}</style>
      
      {/* ── Sidebar ── */}
      <div className="xl:w-[280px] flex-none">
        <div className="sticky top-6 flex h-[calc(100vh-280px)] flex-col gap-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
             <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Documentation Queue</p>
             <div className="relative mt-2">
               <input
                 type="text"
                 placeholder="Search registry..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5"
               />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
            {filteredLeads.map(lead => (
              <DocQueueCard 
                key={lead.id} 
                lead={lead} 
                active={selectedId === lead.id}
                onClick={() => setSelectedId(lead.id)}
                verified={leadStatuses[lead.id]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="min-w-0 flex-1">
        <Form
          form={docForm}
          layout="vertical"
          onValuesChange={handleValuesChange}
          requiredMark={false}
          className="doc-input"
        >
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                 {selectedLead?.name || "Member Profile"}
               </h1>
               <div className="mt-1 flex items-center gap-3">
                  <Tag className={`!border-0 font-bold !rounded-md uppercase text-[10px] tracking-widest ${formValues.isVerified ? "!bg-emerald-500 !text-white" : "!bg-slate-100 !text-slate-600"}`}>
                    {selectedLead?.regNo}
                  </Tag>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-xs font-black text-slate-500">{selectedLead?.make} {selectedLead?.model}</span>
               </div>
             </div>
             <div className="flex gap-2">
                {!formValues.isVerified && (
                  <Button type="primary" className="!rounded-xl !bg-slate-900 !border-slate-900 dark:!bg-white dark:!text-slate-900 font-black shadow-lg">Save Draft</Button>
                )}
                {formValues.isVerified && (
                  <Button icon={<EditOutlined />} onClick={handleUnlock} className="!rounded-xl border-slate-200 font-bold">Modify Records</Button>
                )}
             </div>
          </div>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={finalTabs}
            className="doc-tabs"
          />
        </Form>
      </div>

      <AgreementPreview 
        visible={showPreview} 
        onCancel={() => setShowPreview(false)} 
        data={{
          ...formValues,
          agreementDate: formValues.agreementDate?.toISOString(),
          deliveryTime: formValues.deliveryTime?.toISOString(),
        }}
      />
    </div>
  );
}
