import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  TimePicker,
} from "antd";
import {
  ArrowLeftOutlined,
  LinkOutlined,
  PlusOutlined,
  PrinterOutlined,
  SaveOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import ModuleFrame from "../../../components/ui/ModuleFrame";
import DocumentUpload from "../../../components/ui/DocumentUpload";
import SignaturePadField from "../components/SignaturePadField";
import ThirdPartyMandatePreview from "../components/ThirdPartyMandatePreview";
import UsedCarAgreementPreview from "../components/UsedCarAgreementPreview";

const { TextArea } = Input;

const DRAFT_KEY = "used-car-agreement-draft-v1";

const AGREEMENT_STATUS = [
  "Draft",
  "Pending Approval",
  "Approved For Sign",
  "Sent For Signature",
  "Signed",
  "Completed",
];

const INSURANCE_OPTIONS = [
  "Comprehensive",
  "Zero Dep",
  "Third Party",
  "Expired",
];

const SERVICE_OPTIONS = [
  "RC transfer support",
  "Loan closure handling",
  "Challan settlement",
  "Insurance assistance",
  "Pickup and handover logistics",
];

const PAYMENT_MODE_OPTIONS = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Cheque",
  "RTGS/NEFT",
];

const QUICK_LINKS = [
  {
    label: "Delhi Traffic",
    href: "https://traffic.delhipolice.gov.in/",
    helper: "Open the official Delhi Traffic Police portal",
  },
  {
    label: "e-Challan",
    href: "https://echallan.parivahan.gov.in/index/accused-challan",
    helper: "Check national challan status using the official Parivahan portal",
  },
  {
    label: "mParivahan",
    href: "https://parivahan.gov.in/parivahan/en/content/mparivahan",
    helper: "Open the official mParivahan information page",
  },
];

const INITIAL_VALUES = {
  approvalStatus: "Draft",
  customerName: "",
  registeredOwnerName: "",
  fatherName: "",
  address: "",
  addressProofNo: "",
  contactNo: "",
  emailId: "",
  registrationNo: "",
  make: "",
  model: "",
  variant: "",
  fuelType: "",
  regYear: "",
  vinNo: "",
  engineNo: "",
  chassisNo: "",
  mfgYear: "",
  vehiclePrice: 0,
  offerPrice: 0,
  holdbackAmount: 0,
  holdbackCondition: "",
  holdbackDays: "",
  feesByUser: 0,
  odometerReading: "",
  ownershipSerial: "",
  bankDetails: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  loanAccountDetails: "",
  panCardNo: "",
  aadhaarCardNo: "",
  insuranceType: "",
  hypothecation: false,
  bankName: "",
  delhiChallanCount: "",
  delhiChallanAmount: 0,
  vahanChallanCount: "",
  vahanChallanAmount: 0,
  challanCount: "",
  challanAmount: 0,
  deductionChallan: 0,
  deductionOther: 0,
  instantPaymentCharges: 0,
  serviceCharges: 0,
  tokenAmount: 0,
  balancePaymentReceived: 0,
  deliveryExecutiveName: "",
  deliveryDate: null,
  additionalServices: [],
  notes: "",
  thirdPartyPayment: false,
  thirdPartyName: "",
  thirdPartyPanNo: "",
  thirdPartyRelation: "",
  thirdPartyKycNotes: "",
  thirdPartyPaymentAmount: 0,
  thirdPartyBankName: "",
  thirdPartyAccountNumber: "",
  thirdPartyIfscCode: "",
  thirdPartyMandateDate: null,
  rcCopyUrl: "",
  insuranceCopyUrl: "",
  aadhaarCopyUrl: "",
  panCopyUrl: "",
  challanReportUrl: "",
  theftReportUrl: "",
  mparivahanUrl: "",
  foreclosureProofUrl: "",
  paymentReceiptUrl: "",
  authorityLetterUrl: "",
  thirdPartyMandateUrl: "",
  signedAgreementUrl: "",
  paymentBreakup: [{ label: "Token", amount: 0, mode: "Bank Transfer", date: null }],
  customerSignature: "",
  companySignature: "",
  thirdPartySignature: "",
  witnessOneName: "",
  witnessOneMobile: "",
  witnessTwoName: "",
  witnessTwoMobile: "",
};

function toDateLike(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function normalizeDraftValues(values = {}) {
  return {
    ...INITIAL_VALUES,
    ...values,
    agreementDate: toDateLike(values?.agreementDate),
    deliveryDate: toDateLike(values?.deliveryDate),
    deliveryTime: toDateLike(values?.deliveryTime),
    paymentBreakup: Array.isArray(values?.paymentBreakup)
      ? values.paymentBreakup.map((item) => ({
          label: item?.label || "",
          amount: item?.amount || 0,
          mode: item?.mode || "Bank Transfer",
          date: toDateLike(item?.date),
        }))
      : INITIAL_VALUES.paymentBreakup,
    thirdPartyMandateDate: toDateLike(values?.thirdPartyMandateDate),
  };
}

function SectionShell({ eyebrow, title, subtitle, children }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0d1015] md:p-5 xl:p-6">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DocSlot({ label, name, docTag }) {
  return (
    <Form.Item shouldUpdate noStyle>
      {({ getFieldValue, setFieldValue }) => (
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-xs font-bold tracking-tight text-slate-700 dark:text-slate-200">
            {label}
          </p>
          <DocumentUpload
            value={getFieldValue(name)}
            onChange={(url) => setFieldValue(name, url)}
            uploadTitle={`Upload ${label}`}
            viewerTitle={label}
            docTag={docTag || label}
          />
        </div>
      )}
    </Form.Item>
  );
}

function UploadField({ label, name, docTag }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {label}
      </p>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue, setFieldValue }) => (
          <DocumentUpload
            value={getFieldValue(name)}
            onChange={(url) => setFieldValue(name, url)}
            uploadTitle={`Upload ${label}`}
            viewerTitle={label}
            docTag={docTag || label}
          />
        )}
      </Form.Item>
    </div>
  );
}

function QuickLink({ link }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="group rounded-[22px] border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {link.label}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {link.helper}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white dark:bg-white/10 dark:text-slate-100">
          <LinkOutlined />
        </span>
      </div>
    </a>
  );
}

function buildPrintHtml(markup) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Used Car Agreement</title>
    <style>
      body { margin: 0; padding: 24px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      img { max-width: 100%; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>${markup}</body>
</html>`;
}

export default function UsedCarAgreementPage() {
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const [form] = Form.useForm();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(DRAFT_KEY);
    if (rawDraft) {
      try {
        form.setFieldsValue(normalizeDraftValues(JSON.parse(rawDraft)));
      } catch (error) {
        console.error("[UsedCarAgreementPage] Failed to restore draft", error);
      }
    } else {
      form.setFieldsValue(normalizeDraftValues(INITIAL_VALUES));
    }
    setBooted(true);
  }, [form]);

  const liveValues = Form.useWatch([], form) || INITIAL_VALUES;

  const stats = useMemo(() => {
    const vehiclePrice = Number(liveValues?.vehiclePrice || 0);
    const token = Number(liveValues?.tokenAmount || 0);
    const balanceReceived = Number(liveValues?.balancePaymentReceived || 0);
    const holdback = Number(liveValues?.holdbackAmount || 0);
    return {
      vehiclePrice,
      token,
      outstanding: Math.max(0, vehiclePrice - token - balanceReceived),
      holdback,
    };
  }, [liveValues]);

  const readiness = useMemo(() => {
    const required = [
      liveValues?.customerName,
      liveValues?.fatherName,
      liveValues?.registrationNo,
      liveValues?.make,
      liveValues?.model,
      liveValues?.engineNo,
      liveValues?.chassisNo,
      liveValues?.vehiclePrice,
      liveValues?.agreementDate,
    ];
    const thirdPartyRequired = liveValues?.thirdPartyPayment
      ? [
          liveValues?.thirdPartyName,
          liveValues?.thirdPartyPanNo,
          liveValues?.thirdPartyRelation,
          liveValues?.thirdPartyPaymentAmount,
          liveValues?.thirdPartyBankName,
          liveValues?.thirdPartyAccountNumber,
          liveValues?.thirdPartyIfscCode,
          liveValues?.thirdPartyMandateDate,
          liveValues?.authorityLetterUrl,
          liveValues?.thirdPartyMandateUrl,
          liveValues?.thirdPartySignature,
        ]
      : [];
    const allRequired = [...required, ...thirdPartyRequired];
    const completed = allRequired.filter(Boolean).length;
    return {
      completed,
      total: allRequired.length,
      ready: completed === allRequired.length,
    };
  }, [liveValues]);

  const saveDraft = () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form.getFieldsValue(true)));
  };

  const handleMoveToApproval = () => {
    form.setFieldValue(
      "approvalStatus",
      readiness.ready ? "Pending Approval" : "Draft",
    );
    saveDraft();
  };

  const handlePrint = () => {
    const markup = previewRef.current?.innerHTML;
    if (!markup) return;
    const popup = window.open("", "_blank", "width=1100,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintHtml(markup));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleReset = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    form.setFieldsValue(normalizeDraftValues(INITIAL_VALUES));
  };

  if (!booted) return null;

  return (
    <ModuleFrame>
      <div className="space-y-4 md:space-y-5 xl:space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d1015]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_34%)] px-4 py-5 md:px-5 md:py-6 xl:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  Used cars procurement agreement
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[34px]">
                  Agreement Studio
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 md:text-[15px]">
                  Capture legal, commercial, payment, and document details once. Generate the agreement preview, move it through approval, and collect signatures online inside the same used-cars workflow.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/used-cars/procurement")}>
                  Back to Procurement
                </Button>
                <Button icon={<SaveOutlined />} onClick={saveDraft}>
                  Save Draft
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  Print Preview
                </Button>
                <Button type="primary" icon={<SendOutlined />} onClick={handleMoveToApproval}>
                  Mark Ready To Send
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 px-4 py-4 md:grid-cols-2 xl:grid-cols-4 md:px-5 xl:px-6 dark:border-white/10">
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Vehicle price
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                Rs {stats.vehiclePrice.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Token received
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                Rs {stats.token.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Holdback
              </p>
              <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">
                Rs {stats.holdback.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Form readiness
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                {readiness.completed}/{readiness.total}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={normalizeDraftValues(INITIAL_VALUES)}
              onValuesChange={(_, allValues) => {
                sessionStorage.setItem(DRAFT_KEY, JSON.stringify(allValues));
              }}
            >
              <SectionShell
                eyebrow="Workflow state"
                title="Approval and sending controls"
                subtitle="Requirement sheet says the agreement may be generated by any ID, but customer send-out should wait for admin approval."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Agreement status" name="approvalStatus">
                    <Select options={AGREEMENT_STATUS.map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item label="Agreement date" name="agreementDate">
                    <DatePicker className="w-full" format="DD-MM-YYYY" />
                  </Form.Item>
                  <Form.Item label="Delivery time" name="deliveryTime">
                    <TimePicker className="w-full" format="hh:mm A" use12Hours />
                  </Form.Item>
                  <div className="flex items-end pb-2">
                    {readiness.ready ? (
                      <Tag color="green">Core agreement details captured</Tag>
                    ) : (
                      <Tag color="orange">More fields required before send</Tag>
                    )}
                  </div>
                </div>
                <Alert
                  type="info"
                  showIcon
                  className="mt-1"
                  message="Admin approval gate"
                  description="This first implementation supports status control and printable preview. Actual Adobe Sign style dispatch should be added as the next backend-integrated step."
                />
              </SectionShell>

              <SectionShell
                eyebrow="Seller and vehicle"
                title="Agreement capture"
                subtitle="These fields come directly from the requirements sheet and the signed agreement reference."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Customer name" name="customerName" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Registered owner name" name="registeredOwnerName">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Father's name" name="fatherName" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Contact no." name="contactNo">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Email id" name="emailId">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Address proof no." name="addressProofNo">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Address" name="address" className="md:col-span-2">
                    <TextArea rows={3} />
                  </Form.Item>
                  <Form.Item label="Registration no." name="registrationNo" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Make" name="make" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Model" name="model" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Variant" name="variant">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Fuel type" name="fuelType">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Registration year" name="regYear">
                    <Input />
                  </Form.Item>
                  <Form.Item label="VIN no." name="vinNo">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Engine no." name="engineNo" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Chassis no." name="chassisNo" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Mfg year" name="mfgYear">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Ownership serial" name="ownershipSerial">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Odometer reading" name="odometerReading">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Insurance" name="insuranceType">
                    <Select options={INSURANCE_OPTIONS.map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item label="PAN card no." name="panCardNo">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Aadhaar card no." name="aadhaarCardNo">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Hypothecation" name="hypothecation" valuePropName="checked">
                    <Switch checkedChildren="Yes" unCheckedChildren="No" />
                  </Form.Item>
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) =>
                      getFieldValue("hypothecation") ? (
                        <Form.Item label="Bank name" name="bankName">
                          <Input />
                        </Form.Item>
                      ) : (
                        <div />
                      )
                    }
                  </Form.Item>
                </div>
              </SectionShell>

              <SectionShell
                eyebrow="Commercials"
                title="Pricing, receipts, holdback, and finance context"
                subtitle="The outstanding and agreement preview update live as you key values in."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Form.Item label="Offer price (A)" name="offerPrice">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Vehicle price" name="vehiclePrice">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Holdback amount" name="holdbackAmount">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Fees by user" name="feesByUser">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Token amount" name="tokenAmount">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Balance payment received" name="balancePaymentReceived">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Holdback days permitted" name="holdbackDays">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Challan count" name="challanCount">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Challan amount" name="challanAmount">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Deduction challan (B)" name="deductionChallan">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Other deductions" name="deductionOther">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Instant payment charges (C)" name="instantPaymentCharges">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Service charges" name="serviceCharges">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Delhi traffic challan count" name="delhiChallanCount">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Delhi traffic challan amount" name="delhiChallanAmount">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                  <Form.Item label="Vahan challan count" name="vahanChallanCount">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Vahan challan amount" name="vahanChallanAmount">
                    <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                  </Form.Item>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Holdback condition on delivery" name="holdbackCondition">
                    <TextArea rows={3} />
                  </Form.Item>
                  <div className="grid gap-4">
                    <Form.Item label="Bank details" name="bankDetails">
                      <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label="Loan account details" name="loanAccountDetails">
                      <TextArea rows={2} />
                    </Form.Item>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Form.Item label="Account holder name" name="accountHolderName">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Account no." name="accountNumber">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Branch IFSC" name="ifscCode">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Delivery date" name="deliveryDate">
                    <DatePicker className="w-full" format="DD-MM-YYYY" />
                  </Form.Item>
                </div>

                <Form.Item label="Additional services" name="additionalServices">
                  <Select mode="multiple" options={SERVICE_OPTIONS.map((value) => ({ value, label: value }))} />
                </Form.Item>

                <div className="mt-1 rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Payment receipt breakup
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Add token, balance, part payments, and notes so the agreement preview and receipts stay aligned.
                      </p>
                    </div>
                  </div>

                  <Form.List name="paymentBreakup">
                    {(fields, { add, remove }) => (
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <div
                            key={field.key}
                            className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto] dark:border-white/10 dark:bg-[#11151b]"
                          >
                            <Form.Item {...field} label="Label" name={[field.name, "label"]} className="mb-0">
                              <Input placeholder="Token / Balance / Challan adj." />
                            </Form.Item>
                            <Form.Item {...field} label="Amount" name={[field.name, "amount"]} className="mb-0">
                              <InputNumber className="w-full" min={0} />
                            </Form.Item>
                            <Form.Item {...field} label="Mode" name={[field.name, "mode"]} className="mb-0">
                              <Select options={PAYMENT_MODE_OPTIONS.map((value) => ({ value, label: value }))} />
                            </Form.Item>
                            <Form.Item {...field} label="Date" name={[field.name, "date"]} className="mb-0">
                              <DatePicker className="w-full" format="DD-MM-YYYY" />
                            </Form.Item>
                            <div className="flex items-end">
                              <Button danger onClick={() => remove(field.name)}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ label: "", amount: 0, mode: "Bank Transfer", date: null })}>
                          Add Payment Row
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              </SectionShell>

              <SectionShell
                eyebrow="Reference links"
                title="Compliance capture links"
                subtitle="The requirement sheet explicitly asks for hyperlinks at this stage so the executive can capture challan, theft, and mParivahan details without leaving the workflow."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {QUICK_LINKS.map((link) => (
                    <QuickLink key={link.label} link={link} />
                  ))}
                </div>
              </SectionShell>

              <SectionShell
                eyebrow="Documents"
                title="Upload the documents that support the agreement"
                subtitle="This first version focuses on the document set directly tied to agreement validation and execution."
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <DocSlot label="RC Copy" name="rcCopyUrl" docTag="RC Copy" />
                  <DocSlot label="Insurance Copy" name="insuranceCopyUrl" docTag="Insurance Copy" />
                  <DocSlot label="Aadhaar Copy" name="aadhaarCopyUrl" docTag="Aadhaar Copy" />
                  <DocSlot label="PAN Copy" name="panCopyUrl" docTag="PAN Copy" />
                  <DocSlot label="Challan Report" name="challanReportUrl" docTag="Challan Report" />
                  <DocSlot label="Vehicle Theft Report" name="theftReportUrl" docTag="Vehicle Theft Report" />
                  <DocSlot label="mParivahan Screenshot" name="mparivahanUrl" docTag="mParivahan" />
                  <DocSlot label="Foreclosure Proof" name="foreclosureProofUrl" docTag="Foreclosure" />
                  <DocSlot label="Payment Receipt" name="paymentReceiptUrl" docTag="Payment Receipt" />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Form.Item label="Third party payment involved" name="thirdPartyPayment" valuePropName="checked">
                    <Switch checkedChildren="Yes" unCheckedChildren="No" />
                  </Form.Item>
                  <UploadField
                    label="Signed agreement upload"
                    name="signedAgreementUrl"
                    docTag="Signed Agreement"
                  />
                </div>

                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue }) =>
                    getFieldValue("thirdPartyPayment") ? (
                      <div className="mt-2 space-y-4">
                        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            3rd Party Payment Authorization Form required
                          </p>
                          <p className="mt-1 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                            I have mapped the procurement third-party payment mandate you shared into this flow. Capture the 3rd party identity, bank details, signature, and signed/uploaded mandate here before the payment is processed.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Form.Item label="Third party name" name="thirdPartyName">
                            <Input />
                          </Form.Item>
                          <Form.Item label="Third party PAN no." name="thirdPartyPanNo">
                            <Input />
                          </Form.Item>
                          <Form.Item label="Third party relation / context" name="thirdPartyRelation">
                            <Input />
                          </Form.Item>
                          <Form.Item label="Third party KYC" name="thirdPartyKycNotes">
                            <Input />
                          </Form.Item>
                          <Form.Item label="Mandate date" name="thirdPartyMandateDate">
                            <DatePicker className="w-full" format="DD-MM-YYYY" />
                          </Form.Item>
                          <Form.Item label="Third party payment amount" name="thirdPartyPaymentAmount">
                            <InputNumber className="w-full" min={0} formatter={(v) => `Rs ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v?.replace(/[^\d.]/g, "") || ""} />
                          </Form.Item>
                          <Form.Item label="Bank name" name="thirdPartyBankName">
                            <Input />
                          </Form.Item>
                          <Form.Item label="Account number" name="thirdPartyAccountNumber">
                            <Input />
                          </Form.Item>
                          <Form.Item label="IFSC code" name="thirdPartyIfscCode">
                            <Input />
                          </Form.Item>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <Form.Item name="thirdPartySignature" valuePropName="value" className="mb-0">
                            <SignaturePadField
                              title="3rd Party Signature"
                              subtitle="Capture the signature directly as part of the mandate."
                            />
                          </Form.Item>
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                              <DocSlot
                                label="Authority Letter"
                                name="authorityLetterUrl"
                                docTag="Authority Letter"
                              />
                              <DocSlot
                                label="3rd Party Mandate Scan"
                                name="thirdPartyMandateUrl"
                                docTag="Third Party Mandate"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null
                  }
                </Form.Item>
              </SectionShell>

              <SectionShell
                eyebrow="Execution"
                title="Signatures, witnesses, and handover"
                subtitle="This is the online signing slice. The signatures are captured inside the app and reflected in the printable agreement preview."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Delivery executive name" name="deliveryExecutiveName">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Notes" name="notes">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Witness 1 name" name="witnessOneName">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Witness 1 mobile" name="witnessOneMobile">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Witness 2 name" name="witnessTwoName">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Witness 2 mobile" name="witnessTwoMobile">
                    <Input />
                  </Form.Item>
                </div>

                <div className="mt-2 grid gap-4 lg:grid-cols-2">
                  <Form.Item name="customerSignature" valuePropName="value" className="mb-0">
                    <SignaturePadField
                      title="Seller Signature"
                      subtitle="Capture the seller signature directly in the browser."
                    />
                  </Form.Item>
                  <Form.Item name="companySignature" valuePropName="value" className="mb-0">
                    <SignaturePadField
                      title="Autocredits Representative Signature"
                      subtitle="Use this for the delivery executive or authorized company signatory."
                    />
                  </Form.Item>
                </div>
              </SectionShell>
            </Form>
          </div>

          <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <SectionShell
              eyebrow="Preview"
              title="Live agreement pack"
              subtitle="This preview updates as the form changes. Third-party payment cases include the authorization mandate as part of the same printable agreement pack."
            >
              <div ref={previewRef} className="space-y-4">
                <UsedCarAgreementPreview values={liveValues} />
                {liveValues?.thirdPartyPayment ? (
                  <ThirdPartyMandatePreview values={liveValues} />
                ) : null}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Working notes"
              title="What I surfaced from your requirement sheet"
              subtitle="These are the items I added proactively because they strengthen the agreement workflow."
            >
              <div className="space-y-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                <p>1. Witness fields and handover evidence are included even though they were not called out strongly in the sheet.</p>
                <p>2. Third-party payment now drives conditional authority-letter capture so that risky payment cases are not missed.</p>
                <p>3. Agreement send state is separated from print state because your sheet says generation and customer dispatch should not be treated as the same step.</p>
                <p>4. The structure already leaves room for admin approval audit trail, mail-to-accounts hooks, and final e-sign dispatch in the next backend slice.</p>
              </div>
              <Space className="mt-4">
                <Button onClick={handleReset}>Reset Draft</Button>
                <Button icon={<SaveOutlined />} onClick={saveDraft}>
                  Save Session Draft
                </Button>
              </Space>
            </SectionShell>

            {liveValues?.thirdPartyPayment ? (
              <SectionShell
                eyebrow="Mandate status"
                title="3rd party payment authorization"
                subtitle="This mandate is now part of the agreement pack and must be complete before the procurement file is treated as ready."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Mandate date
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                      {liveValues?.thirdPartyMandateDate
                        ? dayjs(liveValues.thirdPartyMandateDate).format("DD MMM YYYY")
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Mandate readiness
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                      {liveValues?.thirdPartyMandateUrl && liveValues?.thirdPartySignature
                        ? "Ready"
                        : "Pending documents / signature"}
                    </p>
                  </div>
                </div>
              </SectionShell>
            ) : null}
          </div>
        </div>
      </div>
    </ModuleFrame>
  );
}
