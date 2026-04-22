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
  const payoutBaseAmount = odAmount + addOnsAmount;
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
      <div className="rounded-[30px] bg-gradient-to-r from-[#EEF7FF] via-white to-[#FFF4EC] p-5 ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] md:p-6">
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
            <Tag className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !bg-[#EEF7FF] !border-[#C9D9FF] !text-slate-800">
              Margin: {formatMoney(totals.margin, 2)}
            </Tag>
          </div>
        </div>
      </div>

      {/* Section 1: Real-time Quote Data */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <Row gutter={16} align="middle">
          <Col>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400">
              <Wallet size={24} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={5} style={{ margin: 0 }}>
              Real-time Quote Data
            </Title>
            <Text type="secondary">
              Auto-updating from:{" "}
              {acceptedQuote?.insuranceCompany || "accepted quote"}
            </Text>
          </Col>
          <Col>
            <div className="text-right">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Net Premium
              </Text>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {formatMoney(netPremium)}
              </div>
            </div>
          </Col>
        </Row>

        <Divider className="my-4 border-slate-100 dark:border-slate-800" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Accepted Quote",
              value: acceptedQuote?.insuranceCompany || "—",
            },
            { label: "Total Premium", value: formatMoney(netPremium) },
            { label: "OD Amount", value: formatMoney(odAmount) },
            { label: "Add-ons", value: formatMoney(addOnsAmount) },
            {
              label: "Calculated OD + Add-on",
              value: formatMoney(payoutBaseAmount),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {item.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1b: Payout Calculation */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Payout Calculation
            </h2>
            <Text type="secondary">
              Formula: (OD + Add-ons × Payout %) - Sub Vention = Net Amount
            </Text>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${calculatedNetAmount >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"}`}
          >
            {calculatedNetAmount >= 0
              ? "✅ Positive net amount"
              : "⚠ Negative net amount"}
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Net Premium (₹) *
            </Text>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {formatMoney(netPremium, 2)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              From accepted quote: {formatMoney(netPremium, 0)}
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              OD + Addon Amount (₹) *
            </Text>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {formatMoney(payoutBaseAmount, 2)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              OD: {formatMoney(odAmount, 0)} + Add-ons:{" "}
              {formatMoney(addOnsAmount, 0)}
            </div>
          </Col>
          <Col xs={24} md={4}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Payout (%) (From Accepted Quote)
            </Text>
            <InputNumber
              min={0}
              max={100}
              value={payoutPercentage}
              className="mt-1 w-full"
              addonAfter="%"
              disabled
            />
            <div className="mt-1 text-[10px] text-slate-400">
              Set at quote acceptance (editable in case if needed)
            </div>
          </Col>
          <Col xs={24} md={4}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sub Vention (₹) *
            </Text>
            <InputNumber
              min={0}
              value={subventionAmount}
              onChange={(v) => setField("subventionAmount", Number(v || 0))}
              className="mt-1 w-full"
              addonBefore="₹"
            />
            <div className="mt-1 text-[10px] text-slate-400">
              Amount deducted from payout
            </div>
          </Col>
          <Col xs={24} md={4}>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Calculated Net Amount (₹)
            </Text>
            <div
              className={`mt-1 rounded-lg border px-3 py-2 text-sm font-bold ${calculatedNetAmount >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
            >
              {formatMoney(calculatedNetAmount, 2)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {calculatedNetAmount >= 0
                ? "✅ Positive net amount"
                : "⚠ Negative net amount"}
            </div>
          </Col>
        </Row>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-950 dark:ring-slate-800">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Calculation Breakdown
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <span className="text-slate-400">OD + Add-on:</span>{" "}
              <b>{formatMoney(payoutBaseAmount, 0)}</b>
            </div>
            <div>
              <span className="text-slate-400">Payout (%):</span>{" "}
              <b>{payoutPercentage}%</b>
            </div>
            <div>
              <span className="text-slate-400">Payout Amount:</span>{" "}
              <b>{formatMoney(calculatedPayoutAmount, 2)}</b>
            </div>
            <div>
              <span className="text-slate-400">Sub Vention:</span>{" "}
              <b>- {formatMoney(subventionAmount, 0)}</b>
            </div>
          </div>
          <div className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Formula: ({formatMoney(payoutBaseAmount, 0)} × {payoutPercentage}%)
            - {formatMoney(subventionAmount, 0)} ={" "}
            {formatMoney(calculatedNetAmount, 2)}
          </div>
        </div>
        <div className="mt-3 text-[11px] text-slate-400">
          Ledger Margin (Receivables - Payables):{" "}
          <b>{formatMoney(totals.margin, 2)}</b>
        </div>
      </div>

      {/* Section 2: Ledger Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receivables Column */}
        <div className="rounded-xl border border-[#C9D9FF] bg-[#EEF7FF]/45 p-6 dark:border-slate-700 dark:bg-slate-900">
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
              className="!border-[#C9D9FF] !bg-[#C9D9FF] !text-slate-800 hover:!opacity-90 shadow-none"
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
        <div className="rounded-xl border border-[#F3A6B7] bg-[#F3A6B7]/12 p-6 dark:border-slate-700 dark:bg-slate-900">
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
              className="!border-[#F3A6B7] !bg-[#F3A6B7] !text-slate-800 hover:!opacity-90 shadow-none"
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
    ? "border-[#C9D9FF] bg-white"
    : "border-[#F3A6B7]/70 bg-[#FFF4EC]/55";
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
