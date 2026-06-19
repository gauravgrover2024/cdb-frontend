import React, { useCallback, useMemo } from "react";
import {
  AutoComplete,
  Button,
  Col,
  Empty,
  InputNumber,
  Row,
  Popconfirm,
  Tag,
} from "antd";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { computePayoutBaseAmount } from "./payoutRates";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const formatMoney = (value, minimumFractionDigits = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  })}`;

const Step8Payout = ({
  formData,
  setField,
  acceptedQuote,
  acceptedQuoteBreakup,
  bankOptions = [],
}) => {
  const netPremium = Number(
    acceptedQuoteBreakup?.totalPremium ||
      acceptedQuote?.totalPremium ||
      formData.newTotalPremium ||
      0,
  );
  const odAmount = Number(acceptedQuoteBreakup?.odAmt || 0);
  const addOnsAmount = Number(acceptedQuoteBreakup?.addOnsTotal || 0);
  const insurer =
    acceptedQuote?.insuranceCompany || formData.newInsuranceCompany || "";
  const payoutBaseAmount = computePayoutBaseAmount(
    odAmount,
    addOnsAmount,
    insurer,
  );
  const payoutPercentage = Number(
    formData.payoutPercent ?? formData.payoutPercentage ?? 10,
  );
  const subventionAmount = Number(formData.subventionAmount || 0);
  const calculatedPayoutAmount = (payoutBaseAmount * payoutPercentage) / 100;
  const calculatedNetAmount = calculatedPayoutAmount - subventionAmount;

  const receivables = useMemo(
    () =>
      Array.isArray(formData.insurance_receivables)
        ? formData.insurance_receivables
        : [],
    [formData.insurance_receivables],
  );

  const payables = useMemo(
    () =>
      Array.isArray(formData.insurance_payables)
        ? formData.insurance_payables
        : [],
    [formData.insurance_payables],
  );

  const generatePayoutId = (type) => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, "0");
    const prefix = type === "receivable" ? "IR" : "IP";
    return `${prefix}-${year}-${random}`;
  };

  const calculatePayoutAmount = useCallback(
    (percentage) => {
      const perc = parseFloat(percentage) || 0;
      return (payoutBaseAmount * perc) / 100;
    },
    [payoutBaseAmount],
  );

  const calculateTdsAmount = useCallback((payoutAmount, tdsPercentage) => {
    const tdsPerc = parseFloat(tdsPercentage) || 0;
    return (parseFloat(payoutAmount || 0) * tdsPerc) / 100;
  }, []);

  const addReceivable = () => {
    const initAmount = calculatePayoutAmount(payoutPercentage);
    const newList = [
      ...receivables,
      {
        id: Date.now(),
        payoutId: generatePayoutId("receivable"),
        payout_createdAt: new Date().toISOString(),
        payout_type: "Bank",
        payout_party_name: formData.newInsuranceCompany || "",
        payout_percentage: payoutPercentage,
        payout_amount: initAmount,
        tds_percentage: 0,
        tds_amount: 0,
        net_payout_amount: initAmount,
        payout_status: "Expected",
        payout_remarks: "",
      },
    ];
    setField("insurance_receivables", newList);
  };

  const addPayable = () => {
    const initAmount = calculatePayoutAmount(payoutPercentage);
    const newList = [
      ...payables,
      {
        id: Date.now(),
        payoutId: generatePayoutId("payable"),
        payout_createdAt: new Date().toISOString(),
        payout_type: "Broker",
        payout_party_name: formData.brokerName || "",
        payout_percentage: payoutPercentage,
        payout_amount: initAmount,
        tds_percentage: 0,
        tds_amount: 0,
        net_payout_amount: initAmount,
        payout_status: "Expected",
        payout_remarks: "",
      },
    ];
    setField("insurance_payables", newList);
  };

  const updatePayout = (list, setListName, id, field, value) => {
    const newList = list.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (field === "payout_percentage" || field === "tds_percentage") {
        updated.payout_amount = calculatePayoutAmount(
          updated.payout_percentage,
        );
        updated.tds_amount = calculateTdsAmount(
          updated.payout_amount,
          updated.tds_percentage,
        );
        updated.net_payout_amount = updated.payout_amount - updated.tds_amount;
      }

      return updated;
    });
    setField(setListName, newList);
    // schedulePersist(250);
  };

  const deletePayout = (list, setListName, id) => {
    const newList = list.filter((item) => item.id !== id);
    setField(setListName, newList);
    // schedulePersist(250);
  };

  const totals = useMemo(() => {
    const recTotal = receivables.reduce(
      (sum, r) => sum + (r.net_payout_amount || 0),
      0,
    );
    const payTotal = payables.reduce(
      (sum, p) => sum + (p.net_payout_amount || 0),
      0,
    );
    return {
      netReceivable: recTotal,
      netPayable: payTotal,
      margin: recTotal - payTotal,
    };
  }, [receivables, payables]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-slate-200/65 bg-gradient-to-r from-sky-50/90 via-white to-amber-50/50 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={sectionHeaderLabel}>Payout information</div>
            <h2 className="m-0 mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Payout details
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Configure receivables/payables and track net margin
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !border-slate-200 !text-slate-700">
              Premium: {formatMoney(netPremium)}
            </Tag>
            <Tag className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !bg-[#DAF3FF] !border-[#9FC0FF] !text-slate-800">
              Margin: {formatMoney(totals.margin, 2)}
            </Tag>
          </div>
        </div>
      </div>

      {/* Section 1: Real-time Quote Data */}
      <div className="overflow-hidden rounded-xl border border-slate-200/75 bg-white shadow-sm">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
              <Wallet size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Source Data</div>
              <div className="text-sm font-bold text-slate-800">
                {acceptedQuote?.insuranceCompany || "Accepted Quote"}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Premium</div>
              <div className="mt-1 text-lg font-black text-slate-900">{formatMoney(netPremium)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">OD Amount</div>
              <div className="mt-1 text-lg font-black text-slate-900">{formatMoney(odAmount)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Add-ons Total</div>
              <div className="mt-1 text-lg font-black text-slate-900">{formatMoney(addOnsAmount)}</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-500">Payout Base (OD+Addons)</div>
              <div className="mt-1 text-lg font-black text-blue-700">{formatMoney(payoutBaseAmount)}</div>
              {String(formData.newInsuranceCompany || "").toUpperCase().includes("TATA AIG") && (
                <div className="mt-1 text-[10px] font-bold text-orange-600">
                  RSA (Rs 116) excluded as per rules
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Payout Calculation Logic */}
      <div className="overflow-hidden rounded-xl border border-slate-200/75 bg-white shadow-sm">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Calculation</div>
                <div className="text-sm font-bold text-slate-800">Commission & Subvention</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${calculatedNetAmount >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {calculatedNetAmount >= 0 ? "Profit" : "Loss"}
            </div>
          </div>
        </div>

        <div className="p-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payout Percentage</label>
                <InputNumber
                  size="large"
                  min={0}
                  max={100}
                  value={payoutPercentage}
                  className="w-full"
                  suffix="%"
                  disabled
                />
                <div className="text-[10px] text-slate-400 italic">Inherited from quote acceptance</div>
              </div>
            </Col>
            
            <Col xs={24} md={6}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gross Payout (₹)</label>
                <div className="h-11 flex items-center px-4 rounded-xl border border-slate-100 bg-slate-50 font-black text-slate-800">
                  {formatMoney(calculatedPayoutAmount, 2)}
                </div>
                <div className="text-[10px] text-slate-400 italic">{payoutPercentage}% of {formatMoney(payoutBaseAmount)}</div>
              </div>
            </Col>

            <Col xs={24} md={6}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Subvention (₹)</label>
                <InputNumber
                  size="large"
                  min={0}
                  value={subventionAmount}
                  onChange={(v) => setField("subventionAmount", Number(v || 0))}
                  className="w-full"
                  addonBefore="₹"
                  placeholder="0"
                />
                <div className="text-[10px] text-slate-400 italic">Deductions / Discount given</div>
              </div>
            </Col>

            <Col xs={24} md={6}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Net Commission (₹)</label>
                <div className={`h-11 flex items-center px-4 rounded-xl border font-black ${calculatedNetAmount >= 0 ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
                  {formatMoney(calculatedNetAmount, 2)}
                </div>
                <div className="text-[10px] text-slate-400 italic">Gross - Subvention</div>
              </div>
            </Col>
          </Row>

          <div className="mt-8 p-4 rounded-2xl bg-slate-900 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Wallet size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ledger Summary</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black">{formatMoney(totals.margin, 2)}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Margin</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="border-l border-slate-700 pl-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Receivables</div>
                  <div className="text-lg font-black text-blue-400">{formatMoney(totals.netReceivable)}</div>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payables</div>
                  <div className="text-lg font-black text-rose-400">{formatMoney(totals.netPayable)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Ledger Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receivables Column */}
        <div className="rounded-xl border border-[#9FC0FF] bg-[#DAF3FF]/45 p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-slate-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Receivables
              </h3>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={addReceivable}
              className="!border-[#9FC0FF] !bg-[#9FC0FF] !text-slate-800 hover:!opacity-90 shadow-none"
            >
              Add Receivable
            </Button>
          </div>
          {receivables.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No receivables"
            />
          ) : (
            receivables.map((item) => (
              <PayoutItemCard
                key={item.id}
                item={item}
                bankOptions={bankOptions}
                onUpdate={(f, v) =>
                  updatePayout(
                    receivables,
                    "insurance_receivables",
                    item.id,
                    f,
                    v,
                  )
                }
                onDelete={() =>
                  deletePayout(receivables, "insurance_receivables", item.id)
                }
                type="Receivable"
              />
            ))
          )}
        </div>

        {/* Payables Column */}
        <div className="rounded-xl border border-[#FF8EAD] bg-[#FF8EAD]/12 p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-slate-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Payables
              </h3>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={addPayable}
              className="!border-[#FF8EAD] !bg-[#FF8EAD] !text-slate-800 hover:!opacity-90 shadow-none"
            >
              Add Payable
            </Button>
          </div>
          {payables.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No payables tracked"
            />
          ) : (
            payables.map((item) => (
              <PayoutItemCard
                key={item.id}
                item={item}
                bankOptions={bankOptions}
                onUpdate={(f, v) =>
                  updatePayout(payables, "insurance_payables", item.id, f, v)
                }
                onDelete={() =>
                  deletePayout(payables, "insurance_payables", item.id)
                }
                type="Payable"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const PayoutItemCard = ({ item, onUpdate, onDelete, type, bankOptions = [] }) => {
  const isReceivable = type === "Receivable";

  const accent = isReceivable ? "#3b82f6" : "#f43f5e";
  const accentBg = isReceivable ? "#eff6ff" : "#fff1f2";
  const accentBorder = isReceivable ? "#bfdbfe" : "#fecdd3";
  const netColor = isReceivable ? "#16a34a" : "#dc2626";
  const netBg = isReceivable ? "#f0fdf4" : "#fff1f2";
  const netBorder = isReceivable ? "#bbf7d0" : "#fecdd3";

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: accentBorder }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: accentBg, borderBottom: `1px solid ${accentBorder}` }}>
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
            {type}
          </span>
          <span className="text-[11px] font-mono text-slate-400">{item.payoutId}</span>
        </div>
        <Popconfirm
          title="Delete this entry?"
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 size={13} />
          </button>
        </Popconfirm>
      </div>

      {/* ── Editable fields ── */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        <div className="col-span-3 flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Party Name
          </label>
          <AutoComplete
            value={item.payout_party_name || ""}
            onChange={(v) => onUpdate("payout_party_name", v)}
            placeholder="Bank / Broker / Party"
            options={bankOptions.map((name) => ({ label: name, value: name }))}
            style={{ width: "100%" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Payout %
          </label>
          <InputNumber
            style={{ width: "100%" }}
            value={item.payout_percentage}
            onChange={(v) => onUpdate("payout_percentage", v)}
            placeholder="0"
            suffix="%"
            min={0}
            max={100}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            TDS %
          </label>
          <InputNumber
            style={{ width: "100%" }}
            value={item.tds_percentage}
            onChange={(v) => onUpdate("tds_percentage", v)}
            placeholder="0"
            suffix="%"
            min={0}
            max={100}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Status
          </label>
          <Tag
            className="!m-0 !rounded-lg !px-2 !py-1 !text-[11px] !font-bold"
            color={item.payout_status === "Received" ? "green" : "default"}
          >
            {item.payout_status || "Expected"}
          </Tag>
        </div>
      </div>

      {/* ── Computed summary strip ── */}
      <div className="grid grid-cols-3 divide-x border-t" style={{ borderColor: accentBorder, backgroundColor: accentBg }}>
        <div className="px-4 py-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Gross</div>
          <div className="mt-0.5 text-[13px] font-black text-slate-800">
            ₹{Math.round(item.payout_amount || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">TDS</div>
          <div className="mt-0.5 text-[13px] font-black text-rose-500">
            −₹{Math.round(item.tds_amount || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="px-4 py-3 rounded-br-2xl" style={{ backgroundColor: netBg, borderLeft: `1px solid ${netBorder}` }}>
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: netColor }}>
            Net {type === "Receivable" ? "Receivable" : "Payable"}
          </div>
          <div className="mt-0.5 text-[14px] font-black" style={{ color: netColor }}>
            ₹{Math.round(item.net_payout_amount || 0).toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step8Payout;
