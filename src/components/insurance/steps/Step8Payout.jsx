import React, { useCallback, useMemo } from "react";
import {
  AutoComplete,
  Button,
  Col,
  Divider,
  Empty,
  Input,
  InputNumber,
  Row,
  Space,
  Table,
  Typography,
  Popconfirm,
  Tag,
} from "antd";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const { Text, Title } = Typography;
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
  
  // TATA AIG RSA Exclusion: Exclude Rs 116 from payout base as per requirements
  let adjustedAddOnsAmount = addOnsAmount;
  if (String(formData.newInsuranceCompany || "").toUpperCase().includes("TATA AIG")) {
    adjustedAddOnsAmount = Math.max(0, addOnsAmount - 116);
  }
  
  const payoutBaseAmount = odAmount + adjustedAddOnsAmount;
  const payoutPercentage = Number(formData.payoutPercentage ?? 10);
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
    const newList = [
      ...receivables,
      {
        id: Date.now(),
        payoutId: generatePayoutId("receivable"),
        payout_createdAt: new Date().toISOString(),
        payout_type: "Bank",
        payout_party_name: formData.newInsuranceCompany || "",
        payout_percentage: payoutPercentage,
        payout_amount: 0,
        tds_percentage: 0,
        tds_amount: 0,
        net_payout_amount: 0,
        payout_status: "Expected",
        payout_remarks: "",
      },
    ];
    setField("insurance_receivables", newList);
    // schedulePersist(250);
  };

  const addPayable = () => {
    const newList = [
      ...payables,
      {
        id: Date.now(),
        payoutId: generatePayoutId("payable"),
        payout_createdAt: new Date().toISOString(),
        payout_type: "Broker",
        payout_party_name: formData.brokerName || "",
        payout_percentage: payoutPercentage,
        payout_amount: 0,
        tds_percentage: 0,
        tds_amount: 0,
        net_payout_amount: 0,
        payout_status: "Expected",
        payout_remarks: "",
      },
    ];
    setField("insurance_payables", newList);
    // schedulePersist(250);
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
      <div className="rounded-[30px] bg-gradient-to-r from-[#DAF3FF] via-white to-[#FFE6C6] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
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
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
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
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
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
          <Row gutter={[24, 24]}>
            <Col xs={24} md={6}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payout Percentage</label>
                <InputNumber
                  min={0}
                  max={100}
                  value={payoutPercentage}
                  className="w-full !rounded-xl !h-11 !flex !items-center"
                  addonAfter="%"
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
                  min={0}
                  value={subventionAmount}
                  onChange={(v) => setField("subventionAmount", Number(v || 0))}
                  className="w-full !rounded-xl !h-11 !flex !items-center"
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
  const cardClasses = isReceivable
    ? "border-[#9FC0FF] bg-white"
    : "border-[#FF8EAD]/70 bg-[#FFE6C6]/55";
  const tagColor = isReceivable ? "cyan" : "gold";

  return (
    <div
      className={`mb-4 rounded-lg border p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${cardClasses}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <Space>
          <Tag color={tagColor}>{type}</Tag>
          <Text strong>{item.payoutId}</Text>
        </Space>
        <Popconfirm title="Delete this payout?" onConfirm={onDelete}>
          <Button type="text" danger icon={<Trash2 size={14} />} size="small" />
        </Popconfirm>
      </div>

      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            Party Name
          </Text>
          <AutoComplete
            size="small"
            value={item.payout_party_name || ""}
            onChange={(v) => onUpdate("payout_party_name", v)}
            showSearch
            placeholder="Select bank/party"
            options={bankOptions.map((name) => ({ label: name, value: name }))}
            style={{ width: "100%" }}
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            Payout %
          </Text>
          <InputNumber
            size="small"
            style={{ width: "100%" }}
            value={item.payout_percentage}
            onChange={(v) => onUpdate("payout_percentage", v)}
            placeholder="0%"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            TDS %
          </Text>
          <InputNumber
            size="small"
            style={{ width: "100%" }}
            value={item.tds_percentage}
            onChange={(v) => onUpdate("tds_percentage", v)}
            placeholder="5%"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            Amt (Gross)
          </Text>
          <div className="text-sm font-semibold">
            ₹{Math.round(item.payout_amount || 0).toLocaleString("en-IN")}
          </div>
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            TDS Amt
          </Text>
          <div className="text-sm text-rose-500">
            -₹{Math.round(item.tds_amount || 0).toLocaleString("en-IN")}
          </div>
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">
            Net Payout
          </Text>
          <div className="text-sm font-bold text-emerald-600">
            ₹{Math.round(item.net_payout_amount || 0).toLocaleString("en-IN")}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Step8Payout;
