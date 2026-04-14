import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  message,
  Tag,
  InputNumber,
  Row,
  Col,
  Empty,
  Tooltip,
  Switch,
  Divider,
  Upload,
} from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CalendarOutlined,
  HomeOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  TagsOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  AuditOutlined,
  UserOutlined,
  PhoneOutlined,
  CloudDownloadOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  RocketOutlined,
  WalletOutlined,
  HistoryOutlined,
  PictureOutlined,
  FileTextOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import {
  STOCK_STORAGE_KEY,
  MOCK_STOCK_INVENTORY,
  REFURB_CATEGORIES,
  getDefaultStockValues,
} from "./constants";
import { DOCUMENTATION_STORAGE_KEY } from "../DocumentationDesk/constants";
import { PROCUREMENT_STORAGE_KEY } from "../ProcurementLogisticsDesk/constants";
import { BGC_STORAGE_KEY } from "../BackgroundCheckDesk/constants";
import { dayjs } from "../UsedCarLeadManager/utils/formatters";

// ── Metrics ───────────────────────────────────────────────────────
function StockStat({ title, value, icon, color, subValue }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
          {subValue && <p className="mt-1 text-[10px] font-bold text-slate-500">{subValue}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Inventory Card ────────────────────────────────────────────────
function InventoryCard({ car, active, onClick }) {
  const statusStyles = {
    REFURBISHMENT: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400",
    READY_FOR_SALE: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400",
    BOOKED: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400",
  };

  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[22px] border p-3 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-950 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50 dark:border-white/5 dark:bg-white/0 dark:text-slate-200"
      }`}
    >
      <div className="flex gap-3">
        <div className="h-16 w-20 flex-none overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/10">
          <img src={car.thumbnail} alt={car.model} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[9px] font-black uppercase tracking-wider ${active ? "text-white/50" : "text-slate-400"}`}>
              {car.regNo}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${statusStyles[car.status]}`}>
              {car.status?.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-black">{car.make} {car.model}</p>
          <div className="mt-0.5 flex items-center justify-between font-mono">
            <span className={`text-[10px] font-bold ${active ? "text-white/60" : "text-slate-500"}`}>{car.variant}</span>
            <span className="text-[10px] font-black">₹{(car.purchasePrice / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function StockDesk() {
  const [stockForm] = Form.useForm();
  const [selectedId, setSelectedId] = useState(MOCK_STOCK_INVENTORY[0].id);
  const [search, setSearch] = useState("");
  
  const formValues = Form.useWatch([], stockForm) || getDefaultStockValues();

  const selectedCar = useMemo(() => 
    MOCK_STOCK_INVENTORY.find(c => c.id === selectedId),
    [selectedId]
  );

  const filteredCars = useMemo(() => {
    const s = search.toLowerCase();
    return MOCK_STOCK_INVENTORY.filter(c => 
      c.regNo.toLowerCase().includes(s) || 
      c.model.toLowerCase().includes(s)
    );
  }, [search]);

  // Analytics for Landed Cost (Grouped Refurbs)
  const analytics = useMemo(() => {
    const base = selectedCar?.purchasePrice || 0;
    const logistics = selectedCar?.logisticsCost || 0;
    
    // Sum from All Workshops -> All Workorders
    const refurbs = (formValues.workshops || []).reduce((acc, ws) => 
      acc + (ws.workorders || []).reduce((wAcc, wo) => wAcc + (Number(wo?.cost) || 0), 0)
    , 0);

    const landedCost = base + logistics + refurbs;
    const sellingPrice = formValues.sellingPrice || 0;
    const margin = sellingPrice > 0 ? sellingPrice - landedCost : 0;
    const marginPercent = landedCost > 0 ? (margin / landedCost) * 100 : 0;

    return { landedCost, margin, marginPercent, refurbs };
  }, [selectedCar, formValues.workshops, formValues.sellingPrice]);

  // Data Bridging: Aggregating all documents from previous stages
  const vehicleLocker = useMemo(() => {
    const docData = JSON.parse(localStorage.getItem(`${DOCUMENTATION_STORAGE_KEY}_${selectedId}`) || "{}");
    const procData = JSON.parse(localStorage.getItem(`${PROCUREMENT_STORAGE_KEY}_${selectedId}`) || "{}");
    const bgcData = JSON.parse(localStorage.getItem(`${BGC_STORAGE_KEY}_${selectedId}`) || "{}");
    
    return [
      { id: 'rc', label: "RC Original", status: docData.rcType === "Original" ? "Captured" : "Pending", icon: <FileProtectOutlined />, color: "text-blue-500" },
      { id: 'ins', label: "Insurance Policy", status: docData.insuranceType ? "Verified" : "Pending", icon: <SafetyCertificateOutlined />, color: "text-emerald-500" },
      { id: 'pan', label: "Owners PAN", status: docData.panAttested ? "Uploaded" : "Missing", icon: <IdcardOutlined />, color: "text-amber-500" },
      { id: 'agr', label: "Sales Agreement", status: docData.isVerified ? "Generated" : "Pending", icon: <AuditOutlined />, color: "text-indigo-500" },
      { id: 'hand', label: "Physical Handoff", status: procData.logistics?.docsSigned === "Yes" ? "Completed" : "Pending", icon: <CheckCircleOutlined />, color: "text-sky-500" },
      { id: 'chal', label: "Challan Report", status: bgcData.isVerified ? "Audited" : "Pending", icon: <GlobalOutlined />, color: "text-rose-500" },
    ];
  }, [selectedId, formValues.status]);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem(`${STOCK_STORAGE_KEY}_${selectedId}`);
    if (saved) {
      stockForm.setFieldsValue({
        ...getDefaultStockValues(),
        ...JSON.parse(saved)
      });
    } else {
      stockForm.resetFields();
      stockForm.setFieldsValue(getDefaultStockValues());
    }
  }, [selectedId, stockForm]);

  const handleValuesChange = useCallback((_, allValues) => {
    localStorage.setItem(`${STOCK_STORAGE_KEY}_${selectedId}`, JSON.stringify(allValues));
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <style>{`
        .stock-input .ant-input-number-input { font-weight: 800; font-size: 13px; }
        .workshop-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .workshop-card:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
      `}</style>

      {/* ── Left Sidebar: Yard Inventory ── */}
      <div className="xl:w-[280px] flex-none">
        <div className="sticky top-6 flex h-[calc(100vh-280px)] flex-col gap-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
             <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Yard Inventory</p>
             <div className="relative mt-3">
               <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input
                 type="text"
                 placeholder="Search registry..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5"
               />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
            {filteredCars.map(car => (
              <InventoryCard 
                key={car.id} 
                car={car} 
                active={selectedId === car.id}
                onClick={() => setSelectedId(car.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Desk ────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <Form
          form={stockForm}
          layout="vertical"
          onValuesChange={handleValuesChange}
          requiredMark={false}
          className="stock-input"
        >
          {/* Metrics Overview */}
          <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StockStat 
              title="Total Stock Value" 
              value="₹3.42 Cr" 
              icon={<DashboardOutlined />} 
              color="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              subValue="14 Active Vehicles"
            />
            <StockStat 
              title="Avg. Ageing" 
              value="12 Days" 
              icon={<CalendarOutlined />} 
              color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              subValue="Healthy Turnover"
            />
            <StockStat 
              title="Current Landed Cost" 
              value={`₹${analytics.landedCost.toLocaleString()}`} 
              icon={<HomeOutlined />} 
              color="bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400"
              subValue={`Incl. ₹${analytics.refurbs.toLocaleString()} refurb`}
            />
            <StockStat 
              title="Profit Potential" 
              value={`₹${analytics.margin > 0 ? analytics.margin.toLocaleString() : "0"}`} 
              icon={<DollarOutlined />} 
              color={analytics.margin > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-50 text-slate-400"}
              subValue={`${analytics.marginPercent.toFixed(1)}% expected margin`}
            />
          </div>

          {/* Segment 1: Documents Locker (Aggregation) */}
          <div className="mb-6 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
             <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <FolderOpenOutlined />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Document Locker</p>
                </div>
                <Button size="small" icon={<PrinterOutlined />} className="font-bold text-[9px] uppercase tracking-tighter">Print History</Button>
             </div>
             <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {vehicleLocker.map(doc => (
                  <div key={doc.id} className="group relative rounded-2xl border border-slate-50 bg-slate-50/30 p-3 transition-all hover:border-indigo-200 hover:bg-white dark:border-white/5 dark:bg-white/0">
                     <div className="flex items-center justify-between gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/5 ${doc.color}`}>
                           {doc.icon}
                        </div>
                        <Tag className={`!m-0 !border-0 font-bold !text-[9px] uppercase tracking-tighter ${doc.status === "Pending" ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}>
                           {doc.status}
                        </Tag>
                     </div>
                     <p className="mt-3 text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{doc.label}</p>
                     <Button type="text" size="small" icon={<EyeOutlined />} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all !text-slate-400" />
                  </div>
                ))}
             </div>
          </div>

          <Row gutter={[24, 24]}>
            {/* Center Panel: Execution Modules */}
            <Col xs={24} lg={16} className="space-y-6">
              
              {/* Segment 2: Refurbishment Center (Workshop Grouped) */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <ToolOutlined />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-500">Refurbishment Center</p>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Workshop Assignments</h2>
                    </div>
                  </div>
                </div>

                <Form.List name="workshops">
                  {(workshopFields, { add: addWorkshop, remove: removeWorkshop }) => (
                    <div className="space-y-6">
                      {workshopFields.map((wsField) => (
                        <div key={wsField.key} className="workshop-card rounded-3xl border border-slate-100 bg-slate-50/20 p-6 dark:border-white/5 dark:bg-white/0">
                          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 dark:border-white/5">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                <Form.Item name={[wsField.name, "name"]} label={<span className="text-[10px] font-black uppercase text-slate-400">Workshop Name</span>} className="!mb-0">
                                   <Input placeholder="Enter vendor..." className="!h-10 !rounded-xl" />
                                </Form.Item>
                                <Form.Item name={[wsField.name, "contactPerson"]} label={<span className="text-[10px] font-black uppercase text-slate-400">Contact Person</span>} className="!mb-0">
                                   <Input placeholder="Name..." className="!h-10 !rounded-xl" />
                                </Form.Item>
                                <Form.Item name={[wsField.name, "mobile"]} label={<span className="text-[10px] font-black uppercase text-slate-400">Mobile</span>} className="!mb-0">
                                   <Input placeholder="10 Digits..." className="!h-10 !rounded-xl" maxLength={10} />
                                </Form.Item>
                             </div>
                             <Button 
                                type="text" 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => removeWorkshop(wsField.name)}
                                className="font-bold text-[10px] uppercase tracking-tighter"
                             >
                               Remove Workshop
                             </Button>
                          </div>

                          {/* Nested Workorders */}
                          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tasks to be done</p>
                          <Form.List name={[wsField.name, "workorders"]}>
                            {(woFields, { add: addWork, remove: removeWork }) => (
                              <div className="space-y-3">
                                {woFields.map((woField) => (
                                  <div key={woField.key} className="flex flex-col gap-3 lg:flex-row lg:items-end bg-white p-4 rounded-2xl dark:bg-white/5 shadow-sm">
                                    <Form.Item {...woField} name={[woField.name, "category"]} label={<span className="text-[9px] font-black uppercase text-slate-400">Scope</span>} className="!mb-0 flex-1">
                                       <Select placeholder="Category..." className="!h-9 !rounded-xl" options={Object.entries(REFURB_CATEGORIES).map(([v, l]) => ({ value: v, label: l }))} />
                                    </Form.Item>
                                    <Form.Item {...woField} name={[woField.name, "work"]} label={<span className="text-[9px] font-black uppercase text-slate-400">Work Details</span>} className="!mb-0 flex-[2]">
                                       <Input placeholder="What needs fixing?" className="!h-9 !rounded-xl" />
                                    </Form.Item>
                                    <Form.Item {...woField} name={[woField.name, "cost"]} label={<span className="text-[9px] font-black uppercase text-slate-400">Cost (₹)</span>} className="!mb-0 w-24">
                                       <InputNumber className="!w-full !h-9 !rounded-xl" />
                                    </Form.Item>
                                    <Form.Item {...woField} name={[woField.name, "status"]} label={<span className="text-[9px] font-black uppercase text-slate-400">Status</span>} className="!mb-0 w-24">
                                       <Select size="small" className="!rounded-xl" options={[{ value: 'Pending', label: 'Pending' }, { value: 'In Progress', label: 'WIP' }, { value: 'Completed', label: 'Done' }]} />
                                    </Form.Item>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeWork(woField.name)} />
                                  </div>
                                ))}
                                <Button 
                                  type="dashed" 
                                  onClick={() => addWork({ id: Date.now(), category: 'OTHR', work: '', cost: 0, status: 'Pending' })} 
                                  block 
                                  icon={<PlusOutlined />}
                                  className="!h-10 !rounded-xl border-dashed !bg-slate-50/50 hover:!border-amber-400 dark:bg-white/5 text-[11px] font-bold"
                                >
                                  Add Work Item
                                </Button>
                              </div>
                            )}
                          </Form.List>
                        </div>
                      ))}
                      <Button 
                        type="primary" 
                        onClick={() => addWorkshop({ name: '', contactPerson: '', mobile: '', workorders: [] })} 
                        block 
                        icon={<RocketOutlined />}
                        className="!h-14 !rounded-2xl !bg-slate-900 !border-slate-900 dark:!bg-white dark:!text-slate-900 font-black shadow-xl"
                      >
                        Assign To New Workshop
                      </Button>
                    </div>
                  )}
                </Form.List>
              </div>

              {/* Segment 3: Challan Management Ledger */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                 <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                          <SafetyCertificateOutlined />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-500">Challan Management</p>
                          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Traffic Violation Clearance</h2>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-slate-400">Deducted at Procurement</p>
                       <p className="text-lg font-black text-rose-600">₹{formValues.challanManagement?.deductedAmount?.toLocaleString() || 0}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Screenshots */}
                    <div className="lg:col-span-1 space-y-4">
                       <p className="text-[10px] font-black uppercase text-slate-400">Evidence Vault</p>
                       <div className="grid grid-cols-2 gap-2">
                          {[1, 2].map(i => (
                            <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 dark:bg-white/5 dark:border-white/10 group cursor-pointer hover:border-rose-400 transition-all">
                               <PictureOutlined className="text-slate-300 group-hover:text-rose-400" size={20} />
                               <span className="text-[9px] font-bold text-slate-400 uppercase">View Proof</span>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Payment Ledger */}
                    <div className="lg:col-span-2 space-y-4">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-slate-400">Payment Breakdown</p>
                          <div className={`h-2 w-2 rounded-full ${(formValues.challanManagement?.ledger || []).length > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                       </div>
                       
                       <Form.List name={["challanManagement", "ledger"]}>
                          {(cFields, { add: addChallan, remove: removeChallan }) => (
                            <div className="space-y-3">
                               {cFields.map((field) => (
                                 <div key={field.key} className="flex items-end gap-3 p-3 bg-slate-50 rounded-2xl dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <Form.Item {...field} name={[field.name, "challanNo"]} label={<span className="text-[9px] font-bold text-slate-400">Challan #</span>} className="!mb-0 flex-1">
                                       <Input size="small" placeholder="Enter#" className="!rounded-lg" />
                                    </Form.Item>
                                    <Form.Item {...field} name={[field.name, "amount"]} label={<span className="text-[9px] font-bold text-slate-400">Paid (₹)</span>} className="!mb-0 w-24">
                                       <InputNumber size="small" className="!w-full !rounded-lg" />
                                    </Form.Item>
                                    <Form.Item {...field} name={[field.name, "date"]} label={<span className="text-[9px] font-bold text-slate-400">Paid On</span>} className="!mb-0 w-28">
                                       <Input size="small" type="date" className="!rounded-lg text-[10px]" />
                                    </Form.Item>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeChallan(field.name)} />
                                 </div>
                               ))}
                               <Button 
                                 type="dashed" 
                                 onClick={() => addChallan({ challanNo: '', amount: 0, date: '', receiptUploaded: false })} 
                                 block 
                                 icon={<WalletOutlined />}
                                 className="!h-10 !rounded-xl border-slate-200 dark:bg-white/0 font-bold text-xs"
                               >
                                 Add Payment Receipt
                               </Button>
                            </div>
                          )}
                       </Form.List>
                    </div>
                 </div>
              </div>

              {/* Segment 4: Commission Management */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                 <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                       <UserOutlined />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Procurement Commission</p>
                       <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Agency Settlement</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <Form.Item label="Party Name" name={["commission", "partyName"]} className="!mb-0">
                             <Input className="!h-11 !rounded-xl" placeholder="Full name of beneficiary" />
                          </Form.Item>
                          <Form.Item label="Mobile Number" name={["commission", "mobile"]} className="!mb-0">
                             <Input className="!h-11 !rounded-xl" placeholder="10 Digits" maxLength={10} />
                          </Form.Item>
                       </div>
                       <Form.Item label="Detailed Address" name={["commission", "address"]} className="!mb-0">
                          <Input.TextArea rows={2} className="!rounded-xl" placeholder="Primary residence or office address..." />
                       </Form.Item>
                       <div className="grid grid-cols-2 gap-4">
                          <Form.Item label="Commission Amount (₹)" name={["commission", "amount"]} className="!mb-0">
                             <InputNumber className="!w-full !h-11 !rounded-xl font-black text-indigo-600" />
                          </Form.Item>
                          <Form.Item label="Payment Status" name={["commission", "status"]} className="!mb-0">
                             <Select className="!h-11 !rounded-xl" options={[{ value: 'Pending', label: 'Pending' }, { value: 'Paid', label: 'Paid' }, { value: 'Hold', label: 'On Hold' }]} />
                          </Form.Item>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase text-slate-400">KYC Verification</p>
                       <div className="space-y-3">
                          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-between dark:bg-white/5 dark:border-white/10 group cursor-pointer hover:border-indigo-400 transition-all">
                             <div className="flex items-center gap-3">
                                <FileTextOutlined className="text-slate-400" size={18} />
                                <span className="text-[10px] font-black uppercase text-slate-500">Aadhaar Card</span>
                             </div>
                             <Tag className="!m-0 !border-0 font-bold !text-[8px] bg-slate-200">UPLOAD</Tag>
                          </div>
                          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-between dark:bg-white/5 dark:border-white/10 group cursor-pointer hover:border-indigo-400 transition-all">
                             <div className="flex items-center gap-3">
                                <HistoryOutlined className="text-slate-400" size={18} />
                                <span className="text-[10px] font-black uppercase text-slate-500">PAN Card</span>
                             </div>
                             <Tag className="!m-0 !border-0 font-bold !text-[8px] bg-slate-200">UPLOAD</Tag>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </Col>

            {/* Right Panel: Commercial Summary */}
            <Col xs={24} lg={8} className="space-y-6">
              {/* Commercial Metrics */}
              <div className="rounded-[22px] border border-slate-200 bg-slate-900 p-6 text-white dark:border-white/10 dark:bg-white/5">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Commercial Strategy</p>
                  <RocketOutlined className="text-xl text-sky-400" />
                </div>
                
                <div className="space-y-5">
                   <Form.Item 
                    label={<span className="text-white/70 font-bold">List Price (Selling)</span>} 
                    name="sellingPrice"
                   >
                     <InputNumber 
                        className="!w-full !h-12 !rounded-xl !bg-white/10 !border-white/20 !text-white text-lg font-black" 
                        formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={v => v.replace(/₹\s?|(,*)/g, "")}
                     />
                   </Form.Item>

                   <div className="rounded-2xl bg-white/5 p-4 backdrop-blur border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Vehicle Cost + Logistics</span>
                        <span className="font-bold text-white">₹{((selectedCar?.purchasePrice || 0) + (selectedCar?.logisticsCost || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Refurbishment (All Workshops)</span>
                        <span className="font-bold text-amber-400">+ ₹{analytics.refurbs.toLocaleString()}</span>
                      </div>
                      <Divider className="!my-0 !border-white/10" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Total Landed Cost</span>
                        <span className="font-bold text-white">₹{analytics.landedCost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/40">Expected Margin</span>
                        <span className={`text-xl font-black ${analytics.margin > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                           {analytics.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Status Manager */}
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                 <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                       <TagsOutlined />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Market Readiness</p>
                 </div>
                 
                 <div className="space-y-4">
                    <Form.Item label="Current Sales State" name="status">
                       <Select 
                         className="!h-10 !rounded-xl"
                         options={[
                           { value: "REFURBISHMENT", label: "Under Refurbishment" },
                           { value: "READY_FOR_SALE", label: "Ready for Sale" },
                           { value: "BOOKED", label: "Token Received / Booked" },
                           { value: "DELIVERED", label: "Unit Delivered" },
                         ]}
                       />
                    </Form.Item>

                    <Form.Item name="listingReady" valuePropName="checked">
                       <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/0">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Publish to Sales Portal</span>
                          <Switch size="small" />
                       </div>
                    </Form.Item>

                    <Button 
                      type="primary" 
                      block 
                      size="large" 
                      icon={<SaveOutlined />}
                      className="!h-12 !rounded-[22px] !bg-slate-950 !border-slate-950 dark:!bg-white dark:!text-slate-950 font-black shadow-lg"
                      onClick={() => message.success("Stock details updated successfully!")}
                    >
                      Update Stock File
                    </Button>
                 </div>
              </div>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}
