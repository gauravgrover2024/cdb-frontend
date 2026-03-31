// src/modules/receivables/pages/ShowroomReceivablesDashboard.jsx
// Point 7: Excess payment to showroom → commission receivable
// Point 8: Bill printing with bill no + date, status update
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Tag, Button, Input, Space, Modal, Form,
  InputNumber, DatePicker, message, Tooltip, Select,
} from "antd";
import {
  ReloadOutlined, SearchOutlined, PrinterOutlined,
  DollarOutlined, CheckCircleOutlined, PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { paymentsApi } from "../../../api/payments";
import { loansApi } from "../../../api/loans";

const { Option } = Select;
const asInt = (v) => Math.trunc(Number(v) || 0);
const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const fetchAllByPagination = async (fetchPage, pageSize = 500) => {
  let skip = 0;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const res = await fetchPage({ limit: pageSize, skip, noCount: true });
    const page = listFromResponse(res);
    all.push(...page);
    hasMore = Boolean(res?.hasMore);
    skip += pageSize;
  }

  return all;
};

const ShowroomReceivablesDashboard = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Bill printing modal (Point 8)
  const [billModal, setBillModal] = useState(false);
  const [billRecord, setBillRecord] = useState(null);
  const [billForm] = Form.useForm();

  // Excess/commission entry modal (Point 7)
  const [excessModal, setExcessModal] = useState(false);
  const [excessRecord, setExcessRecord] = useState(null);
  const [excessForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [pmtRes, loanRes] = await Promise.all([
        fetchAllByPagination((params) => paymentsApi.getAll(params), 500),
        fetchAllByPagination(
          (params) =>
            loansApi.getAll({
              ...params,
              filterLoanType: "New Car",
              view: "dashboard",
              sortBy: "leadDate",
              sortDir: "desc",
            }),
          300,
        ),
      ]);
      setPayments(Array.isArray(pmtRes) ? pmtRes : []);
      setLoans(Array.isArray(loanRes) ? loanRes : []);
    } catch (err) {
      messageApi.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build loan map for quick lookup
  const loanMap = useMemo(() => {
    const m = {};
    loans.forEach((l) => { if (l.loanId) m[l.loanId] = l; });
    return m;
  }, [loans]);

  // Aggregate by showroom
  const rows = useMemo(() => {
    const byShowroom = {};
    payments.forEach((p) => {
      const showroom = p.showroomName || p.do_dealerName || "Unknown Showroom";
      const loanId = p.loanId;
      const loan = loanMap[loanId] || {};

      if (!byShowroom[showroom]) {
        byShowroom[showroom] = {
          showroom,
          cases: [],
          totalExcess: 0,
          totalCommissionReceivable: 0,
          totalCommissionReceived: 0,
          totalOutstanding: 0,
        };
      }

      const excess = asInt(p.excessPaymentToShowroom);
      const commReceivable = asInt(p.commissionReceivableFromShowroom);
      const commReceived = asInt(p.commissionReceivedFromShowroom);
      const outstanding = asInt(p.outstandingCommissionFromShowroom) ||
        Math.max(0, commReceivable - commReceived);

      byShowroom[showroom].totalExcess += excess;
      byShowroom[showroom].totalCommissionReceivable += commReceivable;
      byShowroom[showroom].totalCommissionReceived += commReceived;
      byShowroom[showroom].totalOutstanding += outstanding;
      byShowroom[showroom].cases.push({
        loanId,
        customerName: loan.customerName || p.customerName || "—",
        excess,
        commReceivable,
        commReceived,
        outstanding,
        billNumber: p.bill_number || p.billNumber || null,
        billDate: p.bill_date || p.billDate || null,
        billStatus: p.billStatus || (p.bill_number ? "Bill Generated" : "Pending"),
        paymentId: p._id,
        showroomName: showroom,
      });
    });

    return Object.values(byShowroom).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [payments, loanMap]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      r.showroom.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  // Point 8: Open bill printing modal
  const openBillModal = (caseRow) => {
    setBillRecord(caseRow);
    billForm.setFieldsValue({
      billNumber: caseRow.billNumber || "",
      billDate: caseRow.billDate ? dayjs(caseRow.billDate) : dayjs(),
    });
    setBillModal(true);
  };

  const handleBillSave = async () => {
    const values = await billForm.validateFields();
    try {
      await paymentsApi.update(billRecord.loanId, {
        bill_number: values.billNumber,
        bill_date: values.billDate.toISOString(),
        billNumber: values.billNumber,
        billDate: values.billDate.toISOString(),
        billStatus: "Bill Generated",
      });
      messageApi.success(`Bill ${values.billNumber} generated ✅`);
      setBillModal(false);
      load();
    } catch (err) {
      messageApi.error("Failed to save bill");
    }
  };

  // Point 7: Record excess payment / commission
  const openExcessModal = (caseRow) => {
    setExcessRecord(caseRow);
    excessForm.resetFields();
    setExcessModal(true);
  };

  const handleExcessSave = async () => {
    const values = await excessForm.validateFields();
    try {
      const existing = payments.find((p) => p.loanId === excessRecord.loanId) || {};
      const newExcess = asInt(existing.excessPaymentToShowroom) + asInt(values.excessAmount);
      const newCommReceivable = asInt(existing.commissionReceivableFromShowroom) + asInt(values.commissionAmount);
      const newCommReceived = asInt(existing.commissionReceivedFromShowroom) + asInt(values.commissionReceived || 0);

      await paymentsApi.update(excessRecord.loanId, {
        excessPaymentToShowroom: newExcess,
        commissionReceivableFromShowroom: newCommReceivable,
        commissionReceivedFromShowroom: newCommReceived,
        outstandingCommissionFromShowroom: Math.max(0, newCommReceivable - newCommReceived),
        showroomName: excessRecord.showroomName,
      });
      messageApi.success("Excess / commission entry saved ✅");
      setExcessModal(false);
      load();
    } catch (err) {
      messageApi.error("Failed to save entry");
    }
  };

  // Expandable case-level rows
  const expandedRowRender = (record) => {
    const caseCols = [
      { title: "Loan ID", dataIndex: "loanId", width: 130 },
      { title: "Customer", dataIndex: "customerName", width: 180 },
      {
        title: "Excess Paid",
        dataIndex: "excess",
        width: 120,
        align: "right",
        render: (v) => v > 0 ? <span className="text-amber-600 font-semibold">{money(v)}</span> : "—",
      },
      {
        title: "Commission Receivable",
        dataIndex: "commReceivable",
        width: 160,
        align: "right",
        render: (v) => v > 0 ? <span className="text-blue-600 font-semibold">{money(v)}</span> : "—",
      },
      {
        title: "Commission Received",
        dataIndex: "commReceived",
        width: 160,
        align: "right",
        render: (v) => v > 0 ? <span className="text-green-600 font-semibold">{money(v)}</span> : "—",
      },
      {
        title: "Outstanding",
        dataIndex: "outstanding",
        width: 130,
        align: "right",
        render: (v) => v > 0 ? <span className="text-rose-600 font-bold">{money(v)}</span> : <Tag color="success">Settled</Tag>,
      },
      {
        title: "Bill Status",
        key: "bill",
        width: 180,
        render: (_, c) => (
          <div className="flex flex-col gap-1">
            <Tag color={c.billStatus === "Bill Generated" ? "green" : "default"}>
              {c.billStatus || "Pending"}
            </Tag>
            {c.billNumber && <span className="text-xs text-muted-foreground">#{c.billNumber} · {c.billDate ? dayjs(c.billDate).format("DD MMM YYYY") : ""}</span>}
          </div>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 180,
        render: (_, c) => (
          <Space size="small">
            <Tooltip title="Add excess / commission entry">
              <Button size="small" icon={<PlusOutlined />} onClick={() => openExcessModal(c)}>Entry</Button>
            </Tooltip>
            <Tooltip title="Generate bill">
              <Button size="small" icon={<PrinterOutlined />} onClick={() => openBillModal(c)}>
                {c.billStatus === "Bill Generated" ? "Reprint" : "Bill"}
              </Button>
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={caseCols}
        dataSource={record.cases.map((c, i) => ({ ...c, key: i }))}
        pagination={false}
        size="small"
      />
    );
  };

  const columns = [
    {
      title: "Showroom",
      dataIndex: "showroom",
      width: 240,
      render: (v) => <span className="font-semibold text-sm">{v}</span>,
    },
    {
      title: "Cases",
      key: "cases",
      width: 80,
      align: "center",
      render: (_, r) => <Tag>{r.cases.length}</Tag>,
    },
    {
      title: "Total Excess Paid",
      dataIndex: "totalExcess",
      width: 160,
      align: "right",
      render: (v) => v > 0 ? <span className="text-amber-600 font-semibold">{money(v)}</span> : "—",
    },
    {
      title: "Commission Receivable",
      dataIndex: "totalCommissionReceivable",
      width: 180,
      align: "right",
      render: (v) => v > 0 ? <span className="text-blue-600 font-semibold">{money(v)}</span> : "—",
    },
    {
      title: "Commission Received",
      dataIndex: "totalCommissionReceived",
      width: 180,
      align: "right",
      render: (v) => v > 0 ? <span className="text-green-600 font-semibold">{money(v)}</span> : "—",
    },
    {
      title: "Outstanding",
      dataIndex: "totalOutstanding",
      width: 140,
      align: "right",
      render: (v) => v > 0
        ? <span className="text-rose-600 font-bold text-base">{money(v)}</span>
        : <Tag color="success">Settled</Tag>,
    },
  ];

  const totalOutstanding = useMemo(() => rows.reduce((s, r) => s + r.totalOutstanding, 0), [rows]);
  const totalExcess = useMemo(() => rows.reduce((s, r) => s + r.totalExcess, 0), [rows]);
  const totalReceivable = useMemo(() => rows.reduce((s, r) => s + r.totalCommissionReceivable, 0), [rows]);

  return (
    <div className="px-4 md:px-6 py-6 bg-slate-50 dark:bg-[#171717] min-h-screen">
      {messageContextHolder}
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Showroom Receivables</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Excess payments & commission receivable from showrooms</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="large">Refresh</Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Excess Paid to Showrooms", value: money(totalExcess), color: "from-amber-500 to-orange-600", icon: <DollarOutlined /> },
          { label: "Total Commission Receivable", value: money(totalReceivable), color: "from-blue-500 to-indigo-600", icon: <DollarOutlined /> },
          { label: "Total Outstanding", value: money(totalOutstanding), color: "from-rose-500 to-red-600", icon: <CheckCircleOutlined /> },
        ].map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} p-4 shadow-lg`}>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/70">{s.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm mb-4">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by showroom name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          size="large"
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl overflow-hidden shadow-sm">
        <Table
          rowKey="showroom"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} showrooms` }}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </div>

      {/* Point 8: Bill printing modal */}
      <Modal
        open={billModal}
        title="Generate Bill"
        onCancel={() => setBillModal(false)}
        onOk={handleBillSave}
        okText="Save & Generate"
        centered
        destroyOnHidden
      >
        {billRecord && (
          <div className="mb-3 text-sm text-muted-foreground">
            Loan <span className="font-semibold text-foreground">{billRecord.loanId}</span> · {billRecord.customerName}
          </div>
        )}
        <Form form={billForm} layout="vertical">
          <Form.Item name="billNumber" label="Bill Number" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="e.g. BILL-2025-001" />
          </Form.Item>
          <Form.Item name="billDate" label="Bill Date" rules={[{ required: true, message: "Required" }]}>
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Form>
        <div className="mt-2 text-xs text-muted-foreground">
          Once saved, status will update to "Bill Generated" and Expected Date will be replaced with Bill No + Date.
        </div>
      </Modal>

      {/* Point 7: Excess / commission entry modal */}
      <Modal
        open={excessModal}
        title="Add Excess / Commission Entry"
        onCancel={() => setExcessModal(false)}
        onOk={handleExcessSave}
        okText="Save Entry"
        centered
        destroyOnHidden
      >
        {excessRecord && (
          <div className="mb-3 text-sm text-muted-foreground">
            Loan <span className="font-semibold text-foreground">{excessRecord.loanId}</span> · {excessRecord.showroomName}
          </div>
        )}
        <Form form={excessForm} layout="vertical">
          <Form.Item name="excessAmount" label="Excess Payment to Showroom (₹)">
            <InputNumber style={{ width: "100%" }} min={0} controls={false} placeholder="Amount paid in excess" />
          </Form.Item>
          <Form.Item name="commissionAmount" label="Commission Receivable from Showroom (₹)">
            <InputNumber style={{ width: "100%" }} min={0} controls={false} placeholder="Commission owed by showroom" />
          </Form.Item>
          <Form.Item name="commissionReceived" label="Commission Received Now (₹)">
            <InputNumber style={{ width: "100%" }} min={0} controls={false} placeholder="Amount received in this entry" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShowroomReceivablesDashboard;
