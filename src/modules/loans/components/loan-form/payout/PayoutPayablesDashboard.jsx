// src/modules/loans/components/loan-form/payout/PayoutPayablesDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Table, Tag, Input, Button, Select } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../../components/AppIcon";
import { loansApi } from "../../../../../api/loans";
import BillPrintingModal from "./BillPrintingModal";
import { Card, CardContent } from "../../../../../components/ui/Card";
import { formatINR } from "../../../../../utils/currency";

const { Option } = Select;

/* ==============================
   Helpers
============================== */

const safeArray = (v) => (Array.isArray(v) ? v : []);

const firstNonEmptyArray = (...candidates) => {
  for (const c of candidates) {
    const arr = safeArray(c);
    if (arr.length > 0) return arr;
  }
  return [];
};

const getCustomerNameFromLoan = (loan) => {
  return (
    loan?.customerName ||
    loan?.profile_customerName ||
    loan?.profile_applicantName ||
    loan?.profile_applicant_name ||
    loan?.applicantName ||
    loan?.applicant_name ||
    loan?.leadName ||
    loan?.customer ||
    loan?.fullName ||
    loan?.name ||
    "-"
  );
};

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

const isWithinExpectedDateRange = (expectedDateStr, from, to) => {
  if (!from && !to) return true;
  if (!expectedDateStr) return false;

  const d = dayjs(expectedDateStr);
  if (!d.isValid()) return false;

  if (from) {
    const f = dayjs(from);
    if (f.isValid() && d.isBefore(f, "day")) return false;
  }

  if (to) {
    const t = dayjs(to);
    if (t.isValid() && d.isAfter(t, "day")) return false;
  }

  return true;
};

/* ==============================
   Component
============================== */
const PayoutPayablesDashboard = () => {
  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loans, setLoans] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Date filter
  const [expectedFrom, setExpectedFrom] = useState("");
  const [expectedTo, setExpectedTo] = useState("");

  const loadLoans = async () => {
    try {
      const res = await loansApi.getAll();
      setLoans(res?.data || []);
    } catch (err) {
      console.error("Failed to load payables from backend:", err);
      setLoans([]);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const rawRows = useMemo(() => {
    const flattened = [];

    (loans || []).forEach((loan) => {
      // ✅ FIXED: support multiple keys + combined payouts
      const list = firstNonEmptyArray(
        loan.loan_payables,
        loan.loanPayables,
        loan.payables,
        loan.loan_payouts, // combined format
      );

      const payablesOnly = list.filter((p) => {
        const type = p?.payout_type;
        const direction = p?.payout_direction;
        return (
          type === "Dealer" || type === "Source" || direction === "Payable"
        );
      });

      payablesOnly.forEach((p) => {
        const loanKey = loan.loanId || loan._id || loan.id;
        const loanDisplayId = loan.loanId || loan.id || loan._id || "-";
        flattened.push({
          key: p.payoutId || p.id,
          payoutId: p.payoutId,
          loanId: loanDisplayId,
          loanKey,
          customerName: getCustomerNameFromLoan(loan),

          dealerName: loan.dealerName || loan.delivery_dealerName || "-",

          payout_type: p.payout_type,
          payout_party_name: p.payout_party_name,
          payout_percentage: p.payout_percentage,
          payout_amount: p.payout_amount,
          tds_amount: p.tds_amount,
          net_amount:
            (Number(p.payout_amount) || 0) - (Number(p.tds_amount) || 0),

          payout_status: p.payout_status || "Expected",
          payout_expected_date: p.payout_expected_date || "",
          payout_received_date: p.payout_received_date || "",
          bill_number: p.bill_number || "",
          bill_date: p.bill_date || "",
        });
      });
    });

    return flattened;
  }, [loans]);

  const partyOptions = useMemo(() => {
    const parties = Array.from(
      new Set(
        rawRows
          .map((r) => r.payout_party_name)
          .filter(Boolean)
          .map((x) => String(x).trim()),
      ),
    );
    return parties.sort();
  }, [rawRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rawRows.filter((r) => {
      const searchOk = q
        ? `${r.loanId} ${r.customerName} ${r.payout_party_name} ${r.payoutId}`
            .toLowerCase()
            .includes(q)
        : true;

      const statusOk =
        statusFilter === "All" ? true : r.payout_status === statusFilter;

      const partyOk =
        partyFilter === "All"
          ? true
          : normalizeText(r.payout_party_name) === normalizeText(partyFilter);

      const typeOk = typeFilter === "All" ? true : r.payout_type === typeFilter;

      const expectedOk = isWithinExpectedDateRange(
        r.payout_expected_date,
        expectedFrom,
        expectedTo,
      );

      return searchOk && statusOk && partyOk && typeOk && expectedOk;
    });
  }, [
    rawRows,
    search,
    statusFilter,
    partyFilter,
    typeFilter,
    expectedFrom,
    expectedTo,
  ]);

  const updatePayableInBackend = async (loanKey, payoutId, patch) => {
    if (!loanKey) return;

    const sourceLoan = (loans || []).find(
      (loan) => (loan.loanId || loan._id || loan.id) === loanKey
    );
    if (!sourceLoan) return;

    const payables = safeArray(sourceLoan.loan_payables);
    const updatedPayables = payables.map((p) =>
      p.payoutId === payoutId ? { ...p, ...patch } : p
    );

    try {
      await loansApi.update(loanKey, { loan_payables: updatedPayables });
      await loadLoans();
    } catch (err) {
      console.error("Failed to update payable in backend:", err);
      alert("Failed to update payable. Please try again.");
    }
  };

  const bulkMarkPaid = async () => {
    if (selectedRowKeys.length === 0) {
      alert("Please select at least one payout to mark as paid.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const selectedIds = new Set(selectedRowKeys);

    const updatesByLoan = new Map();
    rawRows.forEach((row) => {
      if (!selectedIds.has(row.payoutId)) return;
      if (!row.loanKey) return;
      const existing = updatesByLoan.get(row.loanKey) || [];
      existing.push(row.payoutId);
      updatesByLoan.set(row.loanKey, existing);
    });

    try {
      await Promise.all(
        Array.from(updatesByLoan.entries()).map(async ([loanKey, payoutIds]) => {
          const loan = (loans || []).find(
            (l) => (l.loanId || l._id || l.id) === loanKey
          );
          if (!loan) return null;
          const payables = safeArray(loan.loan_payables);
          const updatedPayables = payables.map((p) =>
            payoutIds.includes(p.payoutId)
              ? { ...p, payout_status: "Received", payout_received_date: today }
              : p
          );
          return loansApi.update(loanKey, { loan_payables: updatedPayables });
        })
      );
      alert("Selected payables marked as Paid ✅");
    } catch (err) {
      console.error("Failed to update payables in backend:", err);
      alert("Failed to update payables. Please try again.");
    } finally {
      setSelectedRowKeys([]);
      loadLoans();
    }
  };

  const handleGenerateBill = async (billDetails) => {
    if (!selectedRowKeys.length) {
      throw new Error("No payables selected");
    }

    const selectedIds = new Set(selectedRowKeys);
    const updatesByLoan = new Map();
    
    rawRows.forEach((row) => {
      if (!selectedIds.has(row.payoutId)) return;
      if (!row.loanKey) return;
      const existing = updatesByLoan.get(row.loanKey) || [];
      existing.push(row.payoutId);
      updatesByLoan.set(row.loanKey, existing);
    });

    try {
      await Promise.all(
        Array.from(updatesByLoan.entries()).map(async ([loanKey, payoutIds]) => {
          const loan = (loans || []).find(
            (l) => (l.loanId || l._id || l.id) === loanKey
          );
          if (!loan) return null;
          
          const payables = safeArray(loan.loan_payables);
          const updatedPayables = payables.map((p) =>
            payoutIds.includes(p.payoutId)
              ? {
                  ...p,
                  payout_status: "Bill Generated",
                  bill_number: billDetails.billNumber,
                  bill_date: billDetails.billDate,
                  payout_expected_date: "", // Remove expected date
                }
              : p
          );
          return loansApi.update(loanKey, { loan_payables: updatedPayables });
        })
      );

      // Trigger print dialog after a short delay
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      console.error("Failed to generate bill:", err);
      throw err;
    } finally {
      setSelectedRowKeys([]);
      loadLoans();
    }
  };

  const columns = [
    { title: "Payout ID", dataIndex: "payoutId", width: 160 },
    { title: "Loan ID", dataIndex: "loanId", width: 160 },
    { title: "Customer", dataIndex: "customerName", width: 220 },
    { title: "Party", dataIndex: "payout_party_name", width: 240 },
    {
      title: "Type",
      dataIndex: "payout_type",
      width: 120,
      render: (v) => <Tag>{v || "-"}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "payout_amount",
      width: 140,
      render: (v) => <span className="font-mono">{formatINR(v)}</span>,
    },
    {
      title: "TDS",
      dataIndex: "tds_amount",
      width: 120,
      render: (v) => <span className="font-mono text-muted-foreground">{formatINR(v)}</span>,
    },
    {
      title: "Net",
      dataIndex: "net_amount",
      width: 140,
      render: (v) => (
        <span className="font-mono font-semibold text-primary">
          {formatINR(v)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "payout_status",
      width: 160,
      render: (_, row) => {
        if (row.payout_status === "Bill Generated") {
          return (
            <Tag color="success" className="flex items-center gap-1">
              <Icon name="FileCheck" size={12} />
              Bill Generated
            </Tag>
          );
        }
        return (
          <select
            className="w-full h-9 border border-input rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={row.payout_status}
            onChange={(e) => {
              const val = e.target.value;
              const receivedDate =
                val === "Received"
                  ? row.payout_received_date || new Date().toISOString().split("T")[0]
                  : "";
              updatePayableInBackend(row.loanKey, row.payoutId, {
                payout_status: val,
                payout_received_date: receivedDate,
              });
            }}
          >
            <option value="Expected">Expected</option>
            <option value="Received">Paid</option>
            <option value="Hold">Hold</option>
          </select>
        );
      },
    },
    {
      title: "Expected Date / Bill No.",
      dataIndex: "payout_expected_date",
      width: 180,
      render: (_, row) => {
        if (row.payout_status === "Bill Generated" && row.bill_number) {
          return (
            <div className="text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Icon name="Receipt" size={12} className="text-primary" />
                {row.bill_number}
              </div>
              <div className="text-muted-foreground">
                {row.bill_date ? dayjs(row.bill_date).format("DD MMM YYYY") : "-"}
              </div>
            </div>
          );
        }
        return (
          <div className="relative">
            <Icon
              name="Calendar"
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="date"
              className="w-full h-9 border border-input rounded-md pl-8 pr-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={row.payout_expected_date || ""}
              onChange={(e) =>
                updatePayableInBackend(row.loanKey, row.payoutId, {
                  payout_expected_date: e.target.value,
                })
              }
            />
          </div>
        );
      },
    },
    {
      title: "Paid Date",
      dataIndex: "payout_received_date",
      width: 160,
      render: (_, row) => (
        <div className="relative">
          <Icon
            name="Calendar"
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="date"
            className="w-full h-9 border border-input rounded-md pl-8 pr-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={row.payout_received_date || ""}
            onChange={(e) =>
              updatePayableInBackend(row.loanKey, row.payoutId, {
                payout_received_date: e.target.value,
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <Card className="shadow-elevation-2">
        <CardContent className="p-4 md:p-6 pt-4 md:pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Payout Payables Dashboard
              </h2>
              <p className="text-sm text-muted-foreground">
                Track payouts to give to Dealer / Source
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="primary"
                onClick={() => {
                  if (!selectedRowKeys.length) {
                    alert("Please select at least one payable to generate bill.");
                    return;
                  }
                  setShowBillModal(true);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="Printer" size={16} />
                  Generate Bill
                </span>
              </Button>
              <Button type="default" onClick={bulkMarkPaid}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} />
                  Mark Paid (Bulk)
                </span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Search by Loan ID / Customer / Party / Payout ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-[360px]"
              allowClear
            />

            <Select
              value={statusFilter}
              className="w-full md:w-[180px]"
              onChange={setStatusFilter}
            >
              <Option value="All">All Status</Option>
              <Option value="Expected">Expected</Option>
              <Option value="Bill Generated">Bill Generated</Option>
              <Option value="Received">Paid</Option>
              <Option value="Hold">Hold</Option>
            </Select>

            <Select
              value={typeFilter}
              className="w-full md:w-[180px]"
              onChange={setTypeFilter}
            >
              <Option value="All">All Types</Option>
              <Option value="Dealer">Dealer</Option>
              <Option value="Source">Source</Option>
            </Select>

            <Select
              value={partyFilter}
              className="w-full md:w-[240px]"
              onChange={setPartyFilter}
            >
              <Option value="All">All Parties</Option>
              {partyOptions.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>

            {/* Expected Date Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Expected:</span>
              <div className="relative">
                <Icon
                  name="Calendar"
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="date"
                  value={expectedFrom}
                  onChange={(e) => setExpectedFrom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background pl-8 pr-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
              <span className="text-xs text-muted-foreground">to</span>
              <div className="relative">
                <Icon
                  name="Calendar"
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="date"
                  value={expectedTo}
                  onChange={(e) => setExpectedTo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background pl-8 pr-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setTypeFilter("All");
                setPartyFilter("All");
                setExpectedFrom("");
                setExpectedTo("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elevation-2 mt-4">
        <CardContent className="p-0">
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={filteredRows}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1600 }}
          />
        </CardContent>
      </Card>

      {/* Bill Printing Modal */}
      <BillPrintingModal
        visible={showBillModal}
        onClose={() => setShowBillModal(false)}
        onGenerate={handleGenerateBill}
        selectedPayables={filteredRows.filter((r) =>
          selectedRowKeys.includes(r.key),
        )}
      />
    </div>
  );
};

export default PayoutPayablesDashboard;
