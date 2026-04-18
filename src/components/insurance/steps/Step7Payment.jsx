import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Col,
  Divider,
  Empty,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Radio,
  Row,
  Select,
  Table,
  Typography,
} from "antd";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeIndianRupee,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Info,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";

const { Text } = Typography;

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_MODES = [
  { label: "Cash",   value: "Cash" },
  { label: "Cheque", value: "Cheque" },
  { label: "NEFT",   value: "NEFT" },
  { label: "RTGS",   value: "RTGS" },
  { label: "UPI",    value: "UPI" },
  { label: "Card",   value: "Card" },
  { label: "Other",  value: "Other" },
];

const BANK_NAMES = [
  "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Canara Bank",
  "IndusInd Bank", "Yes Bank", "IDFC First Bank", "Union Bank of India",
  "Federal Bank", "South Indian Bank", "RBL Bank", "Other",
];

const BANK_OPTIONS = BANK_NAMES.map((b) => ({ label: b, value: b }));

const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { amount: 0, mode: "", date: TODAY, refId: "", bankName: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `₹${Math.abs(Math.round(Number(n || 0))).toLocaleString("en-IN")}`;

const needsBank = (mode) =>
  ["Cheque", "NEFT", "RTGS"].includes(mode);

// ─── Sub-form: one payment direction ─────────────────────────────────────────
const PaymentFields = ({
  title,
  subtitle,
  accentColor = "slate", // slate | sky | amber
  form,
  setForm,
  maxAmount,
  maxLabel,
  amountHint,
  required = false,
  autoAmount,          // if set, amount is read-only
}) => {
  const colors = {
    slate:  "bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-700",
    sky:    "bg-sky-50/60 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
    amber:  "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  };
  const headColor = {
    slate: "text-slate-600 dark:text-slate-300",
    sky:   "text-sky-700 dark:text-sky-300",
    amber: "text-amber-700 dark:text-amber-400",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[accentColor]}`}>
      <div className="mb-4">
        <h4 className={`text-sm font-bold ${headColor[accentColor]}`}>{title}</h4>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
        )}
      </div>

      <Row gutter={[14, 14]}>
        {/* Payment Mode */}
        <Col xs={24} sm={12} md={8}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Payment Mode {required && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={form.mode || undefined}
            onChange={(v) => setForm((p) => ({ ...p, mode: v }))}
            style={{ width: "100%" }}
            size="large"
            placeholder="Select payment mode"
            options={PAYMENT_MODES}
          />
          {form.mode === "Cash" && (
            <p className="mt-1 text-[10px] text-slate-400">
              <Info size={10} className="mr-0.5 inline" /> Optional for cash payments
            </p>
          )}
        </Col>

        {/* Amount */}
        <Col xs={24} sm={12} md={8}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {required ? "Payment Amount (₹)" : "Payment Amount (₹)"}{" "}
            {required && <span className="text-red-500">*</span>}
          </label>
          {autoAmount != null ? (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 dark:border-slate-600 dark:bg-slate-800">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {fmt(autoAmount)}
              </span>
              <span className="text-[10px] text-slate-400">(auto-filled)</span>
            </div>
          ) : (
            <InputNumber
              min={0}
              max={maxAmount}
              value={form.amount || 0}
              onChange={(v) => setForm((p) => ({ ...p, amount: Number(v || 0) }))}
              prefix="₹"
              controls={false}
              size="large"
              style={{ width: "100%" }}
              placeholder="0"
            />
          )}
          {maxLabel && (
            <p className="mt-1 text-[10px] text-slate-400">
              Maximum: <b>{fmt(maxAmount)}</b> ({maxLabel})
            </p>
          )}
          {amountHint && (
            <p className="mt-1 text-[10px] text-slate-400">
              Auto credit amount: <b>{amountHint}</b>
            </p>
          )}
        </Col>

        {/* Date */}
        <Col xs={24} sm={12} md={8}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Payment Date {required && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            size="large"
          />
        </Col>

        {/* Transaction ID */}
        <Col xs={24} sm={12} md={8}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Transaction ID
          </label>
          <Input
            value={form.refId}
            onChange={(e) => setForm((p) => ({ ...p, refId: e.target.value }))}
            size="large"
            placeholder="Enter transaction ID (optional)"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            {needsBank(form.mode) ? "Required for bank transfers" : "Optional for cash payments"}
          </p>
        </Col>

        {/* Bank Name */}
        <Col xs={24} sm={12} md={8}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Bank Name
          </label>
          <Select
            value={form.bankName || undefined}
            onChange={(v) => setForm((p) => ({ ...p, bankName: v }))}
            style={{ width: "100%" }}
            size="large"
            placeholder="Select Bank Name"
            options={BANK_OPTIONS}
            allowClear
          />
          <p className="mt-1 text-[10px] text-slate-400">
            {needsBank(form.mode) ? "Required for bank transfers" : "Optional"}
          </p>
        </Col>
      </Row>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Step7Payment = ({
  formData,
  setField,
  setFormData,
  paymentForm,
  setPaymentForm,
  paymentHistory,
  setPaymentHistory,
  schedulePersist,
  acceptedQuote,
}) => {
  const [showSubventionManager, setShowSubventionManager] = useState(false);
  const [subventionForm, setSubventionForm] = useState({ amount: 0, reason: "" });

  /* ── Derived figures ──────────────────────────────────────────────── */
  const grossPremium = Number(formData.newTotalPremium || 0);
  const subventionAmount = Number(formData.subventionAmount || 0);
  const subventionEntries = Array.isArray(formData.subventionEntries) ? formData.subventionEntries : [];
  
  const netCustomerDue = Math.max(0, grossPremium - subventionAmount);

  const customerCollected = useMemo(
    () =>
      paymentHistory
        .filter((p) => p.paymentType === "customer")
        .reduce((s, p) => s + Number(p.amount || 0), 0),
    [paymentHistory],
  );
  const inhouseCollected = useMemo(
    () =>
      paymentHistory
        .filter((p) => p.paymentType === "inhouse")
        .reduce((s, p) => s + Number(p.amount || 0), 0),
    [paymentHistory],
  );
  const customerBalance = Math.max(0, netCustomerDue - customerCollected);
  const isFullyPaid = netCustomerDue > 0 && customerBalance === 0;
  const progressPct =
    netCustomerDue > 0
      ? Math.min(100, (customerCollected / netCustomerDue) * 100)
      : 0;

  // Subvention stats
  const remainingCapacity = Math.max(0, grossPremium - subventionAmount);

  const handleAddSubvention = () => {
    if (subventionForm.amount <= 0) {
      message.error("Please enter a valid amount");
      return;
    }
    if (subventionForm.amount > remainingCapacity) {
      message.error(`Subvention cannot exceed remaining capacity (${fmt(remainingCapacity)})`);
      return;
    }

    const newEntry = {
      _id: `sub-${Date.now()}`,
      amount: Number(subventionForm.amount),
      reason: subventionForm.reason || "Customer discount",
      date: new Date().toISOString(),
    };

    const newEntries = [...subventionEntries, newEntry];
    const newTotal = newEntries.reduce((s, e) => s + e.amount, 0);

    setFormData((prev) => ({
      ...prev,
      subventionEntries: newEntries,
      subventionAmount: newTotal,
    }));

    setSubventionForm({ amount: 0, reason: "" });
    message.success("Subvention entry added");
  };

  const handleRemoveSubvention = (id) => {
    const newEntries = subventionEntries.filter((e) => e._id !== id);
    const newTotal = newEntries.reduce((s, e) => s + e.amount, 0);
    setFormData((prev) => ({
      ...prev,
      subventionEntries: newEntries,
      subventionAmount: newTotal,
    }));
    message.success("Subvention entry removed");
  };

  /* ── Local form state ─────────────────────────────────────────────── */
  const [paymentMadeBy, setPaymentMadeBy] = useState("customer");

  // Customer sub-form (used in both modes)
  const [custForm, setCustForm] = useState({ ...EMPTY_FORM });

  // In-house form (used only in inhouse mode)
  const [inhouseForm, setInhouseForm] = useState({
    ...EMPTY_FORM,
    amount: grossPremium, // auto-fill with gross premium
  });

  /* ── Record payments ──────────────────────────────────────────────── */
  const handleRecordPayment = () => {
    const payments = [];

    if (paymentMadeBy === "customer") {
      // ── Customer mode: one customer payment ──────────────────────
      if (!custForm.amount || Number(custForm.amount) <= 0) {
        message.error("Enter a valid payment amount");
        return;
      }
      payments.push({
        _id: `pay-${Date.now()}`,
        paymentType: "customer",
        amount: Number(custForm.amount),
        paymentMode: custForm.mode || "Cash",
        date: custForm.date,
        transactionRef: custForm.refId,
        bankName: custForm.bankName,
        recordedAt: new Date().toISOString(),
      });
    } else {
      // ── In-house mode: mandatory inhouse + optional customer ──────
      if (!inhouseForm.amount || Number(inhouseForm.amount) <= 0) {
        message.error("Enter the in-house payment amount");
        return;
      }
      payments.push({
        _id: `pay-${Date.now()}-ih`,
        paymentType: "inhouse",
        amount: Number(inhouseForm.amount),
        paymentMode: inhouseForm.mode || "Cash",
        date: inhouseForm.date,
        transactionRef: inhouseForm.refId,
        bankName: inhouseForm.bankName,
        recordedAt: new Date().toISOString(),
      });

      // Optional simultaneous customer payment
      if (Number(custForm.amount) > 0) {
        payments.push({
          _id: `pay-${Date.now()}-cust`,
          paymentType: "customer",
          amount: Number(custForm.amount),
          paymentMode: custForm.mode || "Cash",
          date: custForm.date,
          transactionRef: custForm.refId,
          bankName: custForm.bankName,
          recordedAt: new Date().toISOString(),
        });
      }
    }

    // Persist to history
    setPaymentHistory((prev) => [...prev, ...payments]);

    // Sync running totals in formData
    const custTotal = payments
      .filter((p) => p.paymentType === "customer")
      .reduce((s, p) => s + p.amount, 0);
    const ihTotal = payments
      .filter((p) => p.paymentType === "inhouse")
      .reduce((s, p) => s + p.amount, 0);
    if (custTotal > 0 || ihTotal > 0) {
      setFormData((prev) => ({
        ...prev,
        ...(custTotal > 0 && {
          customerPaymentReceived:
            Number(prev.customerPaymentReceived || 0) + custTotal,
        }),
        ...(ihTotal > 0 && {
          inhousePaymentReceived:
            Number(prev.inhousePaymentReceived || 0) + ihTotal,
        }),
      }));
    }

    // Reset forms
    setCustForm({ ...EMPTY_FORM });
    setInhouseForm({ ...EMPTY_FORM, amount: grossPremium });
    message.success(`${payments.length} payment(s) recorded ✓`);
  };

  /* ── Delete a payment ─────────────────────────────────────────────── */
  const handleDelete = (record) => {
    setPaymentHistory((prev) => prev.filter((p) => p._id !== record._id));
    const key =
      record.paymentType === "customer"
        ? "customerPaymentReceived"
        : "inhousePaymentReceived";
    setFormData((prev) => ({
      ...prev,
      [key]: Math.max(0, Number(prev[key] || 0) - Number(record.amount || 0)),
    }));
    message.success("Payment removed");
  };

  /* ── Running balance in ledger ─────────────────────────────────────── */
  const ledgerRows = useMemo(() => {
    let balance = netCustomerDue;
    return [...paymentHistory]
      .sort((a, b) => (a.recordedAt || "").localeCompare(b.recordedAt || ""))
      .map((p, i) => {
        if (p.paymentType === "customer") balance -= Number(p.amount || 0);
        return { key: p._id || i, ...p, _runBalance: balance };
      });
  }, [paymentHistory, netCustomerDue]);

  /* ── Ledger columns ───────────────────────────────────────────────── */
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      width: 110,
      render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Type",
      dataIndex: "paymentType",
      width: 110,
      render: (t) =>
        t === "customer" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            <ArrowDownLeft size={10} /> Customer
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <ArrowUpRight size={10} /> In-house
          </span>
        ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 120,
      render: (a) => (
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {fmt(a)}
        </span>
      ),
    },
    {
      title: "Mode",
      dataIndex: "paymentMode",
      width: 80,
    },
    {
      title: "Ref / UTR",
      dataIndex: "transactionRef",
      width: 130,
      render: (v) => v || <span className="text-slate-400">—</span>,
    },
    {
      title: "Balance After",
      dataIndex: "_runBalance",
      width: 130,
      render: (v, row) => {
        if (row.paymentType !== "customer")
          return <span className="text-slate-400">—</span>;
        const bal = Math.max(0, v);
        return (
          <span
            className={`font-semibold tabular-nums ${
              bal === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {bal === 0 ? "✓ Paid" : fmt(bal)}
          </span>
        );
      },
    },
    {
      title: "",
      key: "del",
      width: 44,
      render: (_, record) => (
        <Popconfirm
          title="Remove this payment?"
          okText="Remove"
          okType="danger"
          onConfirm={() => handleDelete(record)}
        >
          <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors">
            <Trash2 size={13} />
          </button>
        </Popconfirm>
      ),
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {/* ══ 1. Summary ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              7: Payment
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              icon={<TrendingDown size={14} />}
              onClick={() => setShowSubventionManager(!showSubventionManager)}
              className="text-[11px] font-semibold"
            >
              Add Subvention
            </Button>
            {isFullyPaid && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Fully Paid
              </span>
            )}
          </div>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={6}>
            <div>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Final Premium
              </Text>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {fmt(grossPremium)}
              </div>
              <Text className="text-[11px] text-slate-400">
                From{" "}
                {acceptedQuote?.insuranceCompany || "selected insurance company"}
              </Text>
            </div>
          </Col>

          <Col xs={24} md={6}>
            <div className="group relative cursor-pointer" onClick={() => setShowSubventionManager(!showSubventionManager)}>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Subvention
              </Text>
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {fmt(subventionAmount)}
                <TrendingDown size={18} className="opacity-40" />
              </div>
              {subventionEntries.length > 0 && (
                <Text className="text-[10px] text-slate-400">
                  {subventionEntries.length} entries recorded
                </Text>
              )}
              {!showSubventionManager && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-900/50">
                  <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white">Click to Manage</span>
                </div>
              )}
            </div>
          </Col>

          <Col xs={24} md={6}>
            <div>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Net Premium
              </Text>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {fmt(netCustomerDue)}
              </div>
              <Text className="text-[10px] text-slate-400">Final amount to collect</Text>
            </div>
          </Col>

          <Col xs={24} md={6}>
            <div>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Customer Paid
              </Text>
              <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {fmt(customerCollected)}
              </div>
              <Text className="text-[10px] text-slate-400">
                {isFullyPaid ? "Fully settled" : `${fmt(customerBalance)} remaining`}
              </Text>
            </div>
          </Col>
        </Row>

        {/* ── Subvention Entry Management Area ── */}
        {showSubventionManager && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/30 p-6 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Add Subvention Entry
              </h4>
              <Button size="small" type="text" onClick={() => setShowSubventionManager(false)}>Close</Button>
            </div>

            <Row gutter={[24, 24]} className="mb-8">
              <Col xs={24} sm={8}>
                <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-tight">Existing Subvention</Text>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{fmt(subventionAmount)}</div>
              </Col>
              <Col xs={24} sm={8}>
                <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-tight">New Subvention</Text>
                <div className="text-xl font-bold text-amber-600">{fmt(subventionForm.amount)}</div>
              </Col>
              <Col xs={24} sm={8}>
                <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-tight">Remaining Capacity</Text>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{fmt(remainingCapacity)}</div>
              </Col>
            </Row>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Subvention Amount (₹) *</label>
                <InputNumber
                  min={0}
                  max={remainingCapacity}
                  value={subventionForm.amount}
                  onChange={(v) => setSubventionForm(p => ({ ...p, amount: Number(v || 0) }))}
                  prefix="₹"
                  className="w-full"
                  size="large"
                  placeholder="Enter amount"
                />
                <p className="mt-1 text-[10px] text-slate-400">Maximum: <b>{fmt(remainingCapacity)}</b></p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reason for Subvention</label>
                <Input
                  value={subventionForm.reason}
                  onChange={(e) => setSubventionForm(p => ({ ...p, reason: e.target.value }))}
                  size="large"
                  placeholder="e.g., Customer discount, Special offer, etc."
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Button 
                type="primary" 
                size="large" 
                onClick={handleAddSubvention}
                disabled={subventionForm.amount <= 0}
                className="bg-amber-600 hover:bg-amber-700 border-none"
              >
                Add to List
              </Button>
              <div className="rounded-lg bg-amber-100/50 p-3 flex gap-2 dark:bg-amber-900/20">
                <Info size={16} className="text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed italic">
                  <b>Note:</b> Subvention reduces the amount customer needs to pay. The auto credit amount will be adjusted automatically. Payout will be enabled only when customer fully pays the remaining amount.
                </p>
              </div>
            </div>

            {/* Subvention entries list */}
            {subventionEntries.length > 0 && (
              <div className="mt-8">
                <h5 className="text-[11px] font-bold uppercase text-slate-400 mb-2">Recorded Subvention History</h5>
                <div className="space-y-2">
                  {subventionEntries.map((e) => (
                    <div key={e._id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900">
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(e.amount)}</div>
                        <div className="text-[10px] text-slate-400">{e.reason} • {dayjs(e.date).format("DD MMM, YYYY")}</div>
                      </div>
                      <Popconfirm title="Remove subvention?" onConfirm={() => handleRemoveSubvention(e._id)}>
                        <Button size="small" danger icon={<Trash2 size={12} />} type="text" />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Divider className="my-6 border-slate-100 dark:border-slate-800" />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Text className="text-xs font-semibold text-slate-500">
              Payment Progress (After Subvention)
            </Text>
            <Text className="text-sm font-bold text-slate-900 dark:text-white">
              {progressPct.toFixed(0)}%
            </Text>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isFullyPaid ? "bg-emerald-500" : "bg-sky-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Progress: <b>{fmt(customerCollected)}</b> / <b>{fmt(netCustomerDue)}</b>
          </p>
        </div>
      </div>

      {/* ══ 2. Record Payment ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

        {/* Payment Made By selector */}
        <div className="mb-6">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Payment Made By
          </label>
          <Radio.Group
            value={paymentMadeBy}
            onChange={(e) => {
              setPaymentMadeBy(e.target.value);
              setCustForm({ ...EMPTY_FORM });
              setInhouseForm({ ...EMPTY_FORM, amount: grossPremium });
            }}
            optionType="button"
            buttonStyle="solid"
            size="large"
          >
            <Radio.Button value="customer">Customer</Radio.Button>
            <Radio.Button value="inhouse">In House</Radio.Button>
          </Radio.Group>
        </div>

        {/* ── Customer mode ── */}
        {paymentMadeBy === "customer" && (
          <PaymentFields
            title="Customer Payment"
            accentColor="sky"
            form={custForm}
            setForm={setCustForm}
            maxAmount={customerBalance}
            maxLabel={`Customer can pay up to ${fmt(customerBalance)} total`}
            required
          />
        )}

        {/* ── In-house mode ── */}
        {paymentMadeBy === "inhouse" && (
          <div className="flex flex-col gap-5">
            {/* Primary: In-house (AC → Insurer) */}
            <PaymentFields
              title="In House Payment"
              subtitle="Auto Credit to Insurance Company"
              accentColor="amber"
              form={inhouseForm}
              setForm={setInhouseForm}
              autoAmount={grossPremium}
              amountHint={`${fmt(grossPremium)} (Final Premium)`}
              required
            />

            {/* Secondary: Optional customer payment recorded simultaneously */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-4 flex items-center gap-2">
                <ArrowDownLeft size={15} className="text-sky-500" />
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Payment Made by Customer
                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-normal text-slate-500 dark:bg-slate-700">
                    Optional
                  </span>
                </h4>
              </div>
              <p className="mb-4 text-[11px] text-slate-400">
                Fill only if customer has made a payment alongside this in-house transaction.
              </p>
              <PaymentFields
                accentColor="slate"
                form={custForm}
                setForm={setCustForm}
                maxAmount={customerBalance}
                maxLabel={`Customer can pay up to ${fmt(customerBalance)} total`}
              />
            </div>
          </div>
        )}

        {/* Quick balance shortcut */}
        {paymentMadeBy === "customer" && customerBalance > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-2 dark:bg-sky-950/30">
            <Clock size={12} className="text-sky-500" />
            <Text className="text-[11px] text-sky-600 dark:text-sky-400">
              Remaining balance: <b>{fmt(customerBalance)}</b>
            </Text>
            <button
              className="ml-auto text-[10px] font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-700"
              onClick={() => setCustForm((p) => ({ ...p, amount: customerBalance }))}
            >
              Fill full balance
            </button>
          </div>
        )}

        <Divider className="border-slate-100 dark:border-slate-800" style={{ margin: "20px 0" }} />

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="primary"
            size="large"
            onClick={handleRecordPayment}
            className="h-11 px-8 font-semibold"
          >
            Record Payment
          </Button>
          <Button
            size="large"
            onClick={() => {
              setCustForm({ ...EMPTY_FORM });
              setInhouseForm({ ...EMPTY_FORM, amount: grossPremium });
            }}
            className="h-11 border-slate-200 dark:border-slate-700"
          >
            Clear Form
          </Button>
          <Text className="ml-auto hidden text-[11px] text-slate-400 md:block">
            {paymentMadeBy === "customer"
              ? "💡 Tracks payment from customer to AutoCredit."
              : "💡 Tracks AutoCredit paying the insurance company — also log any simultaneous customer payment below."}
          </Text>
        </div>
      </div>

      {/* ══ 3. Payment Ledger ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Payment Ledger
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
              {paymentHistory.length} records
            </span>
          </div>
          {paymentHistory.length > 0 && (
            <div className="flex flex-wrap gap-4 text-[11px]">
              <span className="text-sky-600 dark:text-sky-400">Customer: <b>{fmt(customerCollected)}</b></span>
              <span className="text-amber-600 dark:text-amber-400">In-house: <b>{fmt(inhouseCollected)}</b></span>
              <span className="text-slate-600 dark:text-slate-300">Total: <b>{fmt(customerCollected + inhouseCollected)}</b></span>
            </div>
          )}
        </div>

        {paymentHistory.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">No payments recorded yet</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Use the form above to record payments
                </Text>
              </div>
            }
          />
        ) : (
          <Table
            size="small"
            dataSource={ledgerRows}
            columns={columns}
            pagination={false}
            scroll={{ x: 720 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-slate-50 dark:bg-slate-800/60">
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Totals</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong className="text-emerald-700 dark:text-emerald-400">
                      {fmt(customerCollected + inhouseCollected)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={2} />
                  <Table.Summary.Cell index={5}>
                    <Text strong className={isFullyPaid ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {isFullyPaid ? "✓ Settled" : `${fmt(customerBalance)} due`}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default Step7Payment;
