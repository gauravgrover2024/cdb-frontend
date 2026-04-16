import React, { useCallback, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Popconfirm,
  Tag,
} from "antd";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const { Text, Title } = Typography;

const Step8Payout = ({ formData, setField, setFormData, schedulePersist }) => {
  const premiumBase = parseFloat(formData.newTotalPremium || 0);

  const receivables = useMemo(() => 
    Array.isArray(formData.insurance_receivables) ? formData.insurance_receivables : []
  , [formData.insurance_receivables]);

  const payables = useMemo(() => 
    Array.isArray(formData.insurance_payables) ? formData.insurance_payables : []
  , [formData.insurance_payables]);

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
      return (premiumBase * perc) / 100;
    },
    [premiumBase],
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
        payout_percentage: 0,
        payout_amount: 0,
        tds_percentage: 5,
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
        payout_percentage: 0,
        payout_amount: 0,
        tds_percentage: 5,
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
        updated.payout_amount = calculatePayoutAmount(updated.payout_percentage);
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
      {/* Section 1: Payout Summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <Row gutter={16} align="middle">
          <Col>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400">
              <Wallet size={24} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={5} style={{ margin: 0 }}>Payout Summary</Title>
            <Text type="secondary">Base Amount (Premium): ₹{premiumBase.toLocaleString("en-IN")}</Text>
          </Col>
          <Col>
            <div className="text-right">
              <Text type="secondary" style={{ fontSize: 12 }}>Estimated Margin</Text>
              <div className={`text-xl font-bold ${totals.margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ₹{totals.margin.toLocaleString("en-IN")}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Section 2: Ledger Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receivables Column */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Receivables</h3>
            </div>
            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={addReceivable} className="shadow-none">
              Add Receivable
            </Button>
          </div>
            {receivables.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No receivables" />
            ) : (
              receivables.map((item) => (
                <PayoutItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(f, v) => updatePayout(receivables, "insurance_receivables", item.id, f, v)}
                  onDelete={() => deletePayout(receivables, "insurance_receivables", item.id)}
                  type="Receivable"
                />
              ))
            )}
        </div>

        {/* Payables Column */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-rose-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Payables</h3>
            </div>
            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={addPayable} className="shadow-none">
              Add Payable
            </Button>
          </div>
          {payables.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No payables tracked" />
          ) : (
            payables.map((item) => (
              <PayoutItemCard
                key={item.id}
                item={item}
                onUpdate={(f, v) => updatePayout(payables, "insurance_payables", item.id, f, v)}
                onDelete={() => deletePayout(payables, "insurance_payables", item.id)}
                type="Payable"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const PayoutItemCard = ({ item, onUpdate, onDelete, type }) => {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between">
        <Space>
          <Tag color={type === "Receivable" ? "blue" : "orange"}>{type}</Tag>
          <Text strong>{item.payoutId}</Text>
        </Space>
        <Popconfirm title="Delete this payout?" onConfirm={onDelete}>
          <Button type="text" danger icon={<Trash2 size={14} />} size="small" />
        </Popconfirm>
      </div>

      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">Party Name</Text>
          <Input
            size="small"
            value={item.payout_party_name}
            onChange={(e) => onUpdate("payout_party_name", e.target.value)}
            placeholder="Name"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">Payout %</Text>
          <InputNumber
            size="small"
            style={{ width: "100%" }}
            value={item.payout_percentage}
            onChange={(v) => onUpdate("payout_percentage", v)}
            placeholder="0%"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">TDS %</Text>
          <InputNumber
            size="small"
            style={{ width: "100%" }}
            value={item.tds_percentage}
            onChange={(v) => onUpdate("tds_percentage", v)}
            placeholder="5%"
          />
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">Amt (Gross)</Text>
          <div className="text-sm font-semibold">₹{Math.round(item.payout_amount || 0).toLocaleString("en-IN")}</div>
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">TDS Amt</Text>
          <div className="text-sm text-rose-500">-₹{Math.round(item.tds_amount || 0).toLocaleString("en-IN")}</div>
        </Col>
        <Col span={8}>
          <Text type="secondary" className="text-[10px] uppercase font-bold">Net Payout</Text>
          <div className="text-sm font-bold text-emerald-600">₹{Math.round(item.net_payout_amount || 0).toLocaleString("en-IN")}</div>
        </Col>
      </Row>
    </div>
  );
};

export default Step8Payout;
