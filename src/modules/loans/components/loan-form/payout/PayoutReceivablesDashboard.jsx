// src/modules/loans/components/loan-form/payout/PayoutReceivablesDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Select, Input, Button, Space } from "antd";
import dayjs from "dayjs";

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

const normalizeBankName = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

/* ==============================
   Component
============================== */
const PayoutReceivablesDashboard = () => {
  const [rows, setRows] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [bankFilter, setBankFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  // Date filters (Expected Date range)
  const [expectedFrom, setExpectedFrom] = useState("");
  const [expectedTo, setExpectedTo] = useState("");

  // Bulk selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const loadReceivables = () => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");

    console.log("📦 savedLoans count:", savedLoans.length);

    const receivables = savedLoans.flatMap((loan) => {
      // ✅ FIXED: properly fallback to old keys if loan_receivables is empty
      const list = firstNonEmptyArray(
        loan.loan_receivables,
        loan.loanReceivables,
        loan.receivables,
        loan.loan_payouts // fallback for old combined storage
      );

      // In case old combined format exists, filter only receivables
      const receivableList = list.filter((p) => {
        const type = p?.payout_type;
        const direction = p?.payout_direction;
        return (
          type === "Bank" || type === "Insurance" || direction === "Receivable"
        );
      });

      return receivableList.map((p) => ({
        ...p,
        loanId: loan.loanId || loan.id || "-",
        customerName: getCustomerNameFromLoan(loan),

        // keep some loan context (useful for filters)
        approval_bankName: loan.approval_bankName || "-",
        approval_status: loan.approval_status || "-",
        netLoanApproved: loan.approval_breakup_netLoanApproved || 0,
      }));
    });

    console.log("✅ Total receivables loaded:", receivables.length);
    setRows(receivables);
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  /* ==============================
     Filters
============================== */
  const bankOptions = useMemo(() => {
    const banks = Array.from(
      new Set(
        rows
          .map((r) => r.payout_party_name)
          .filter(Boolean)
          .map((b) => String(b).trim())
      )
    );
    return banks.sort();
  }, [rows]);

  const isWithinExpectedDateRange = (expectedDateStr) => {
    if (!expectedFrom && !expectedTo) return true;

    // if user applied date filter, rows without expected date should not show
    if (!expectedDateStr) return false;

    const d = dayjs(expectedDateStr);
    if (!d.isValid()) return false;

    if (expectedFrom) {
      const from = dayjs(expectedFrom);
      if (from.isValid() && d.isBefore(from, "day")) return false;
    }

    if (expectedTo) {
      const to = dayjs(expectedTo);
      if (to.isValid() && d.isAfter(to, "day")) return false;
    }

    return true;
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const statusOk =
        statusFilter === "All" ? true : r.payout_status === statusFilter;

      const bankOk =
        bankFilter === "All"
          ? true
          : normalizeBankName(r.payout_party_name) ===
            normalizeBankName(bankFilter);

      const searchOk = searchText
        ? `${r.loanId} ${r.customerName} ${r.payout_party_name} ${r.payoutId}`
            .toLowerCase()
            .includes(searchText.toLowerCase())
        : true;

      const expectedDateOk = isWithinExpectedDateRange(r.payout_expected_date);

      return statusOk && bankOk && searchOk && expectedDateOk;
    });
  }, [rows, statusFilter, bankFilter, searchText, expectedFrom, expectedTo]);

  /* ==============================
     Storage Update (Single payoutId)
============================== */
  const updateReceivableInStorage = (payoutId, patch) => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");

    const updatedLoans = savedLoans.map((loan) => {
      const receivables = safeArray(loan.loan_receivables);

      // if this loan doesn't have receivables, skip quickly
      if (!receivables.length) return loan;

      const updatedReceivables = receivables.map((p) => {
        if (p.payoutId !== payoutId) return p;
        return { ...p, ...patch };
      });

      return {
        ...loan,
        loan_receivables: updatedReceivables,
      };
    });

    localStorage.setItem("savedLoans", JSON.stringify(updatedLoans));
    loadReceivables();
  };

  /* ==============================
     Bulk Mark Received
============================== */
  const bulkMarkAsReceived = () => {
    if (!selectedRows.length) {
      alert("Please select at least 1 payout");
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");

    const selectedIds = new Set(selectedRows.map((r) => r.payoutId));

    const updatedLoans = savedLoans.map((loan) => {
      const receivables = safeArray(loan.loan_receivables);
      if (!receivables.length) return loan;

      const updatedReceivables = receivables.map((p) => {
        if (!selectedIds.has(p.payoutId)) return p;

        return {
          ...p,
          payout_status: "Received",
          payout_received_date: today,
        };
      });

      return {
        ...loan,
        loan_receivables: updatedReceivables,
      };
    });

    localStorage.setItem("savedLoans", JSON.stringify(updatedLoans));
    loadReceivables();

    setSelectedRowKeys([]);
    setSelectedRows([]);

    alert("Selected receivables marked as Received ✅");
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rowsSelected) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rowsSelected);
    },
  };

  const statusTag = (status) => {
    if (status === "Received") return <Tag color="green">Received</Tag>;
    if (status === "Hold") return <Tag color="orange">Hold</Tag>;
    return <Tag color="blue">Expected</Tag>;
  };

  /* ==============================
     Columns
============================== */
  const columns = [
    { title: "Payout ID", dataIndex: "payoutId", key: "payoutId", width: 160 },
    { title: "Loan ID", dataIndex: "loanId", key: "loanId", width: 150 },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      width: 220,
    },
    {
      title: "Type",
      dataIndex: "payout_type",
      key: "payout_type",
      width: 130,
      render: (v) => <Tag>{v || "-"}</Tag>,
    },
    {
      title: "Bank / Party",
      dataIndex: "payout_party_name",
      key: "payout_party_name",
      width: 240,
    },
    {
      title: "Amount",
      dataIndex: "payout_amount",
      key: "payout_amount",
      width: 140,
      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      title: "TDS",
      dataIndex: "tds_amount",
      key: "tds_amount",
      width: 120,
      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      title: "Net",
      key: "net",
      width: 140,
      render: (_, r) => {
        const net = Number(r.payout_amount || 0) - Number(r.tds_amount || 0);
        return (
          <b style={{ color: "#1677ff" }}>₹{net.toLocaleString("en-IN")}</b>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "payout_status",
      key: "payout_status",
      width: 180,
      render: (v, r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {statusTag(v)}
          <Select
            size="small"
            value={v || "Expected"}
            onChange={(val) =>
              updateReceivableInStorage(r.payoutId, {
                payout_status: val,
                payout_received_date:
                  val === "Received"
                    ? r.payout_received_date || dayjs().format("YYYY-MM-DD")
                    : "",
              })
            }
          >
            <Option value="Expected">Expected</Option>
            <Option value="Received">Received</Option>
            <Option value="Hold">Hold</Option>
          </Select>
        </div>
      ),
    },
    {
      title: "Expected Date",
      dataIndex: "payout_expected_date",
      key: "payout_expected_date",
      width: 160,
      render: (v, r) => (
        <input
          type="date"
          value={v || ""}
          style={{
            width: "100%",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: "4px 6px",
          }}
          onChange={(e) =>
            updateReceivableInStorage(r.payoutId, {
              payout_expected_date: e.target.value,
            })
          }
        />
      ),
    },
    {
      title: "Received Date",
      dataIndex: "payout_received_date",
      key: "payout_received_date",
      width: 160,
      render: (v, r) => (
        <input
          type="date"
          value={v || ""}
          style={{
            width: "100%",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: "4px 6px",
          }}
          onChange={(e) =>
            updateReceivableInStorage(r.payoutId, {
              payout_received_date: e.target.value,
            })
          }
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Payout Receivables Dashboard"
        extra={<Button onClick={loadReceivables}>Refresh</Button>}
      >
        {/* Filters */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            value={statusFilter}
            style={{ width: 160 }}
            onChange={setStatusFilter}
          >
            <Option value="All">All Status</Option>
            <Option value="Expected">Expected</Option>
            <Option value="Received">Received</Option>
            <Option value="Hold">Hold</Option>
          </Select>

          <Select
            value={bankFilter}
            style={{ width: 220 }}
            onChange={setBankFilter}
          >
            <Option value="All">All Banks</Option>
            {bankOptions.map((b) => (
              <Option key={b} value={b}>
                {b}
              </Option>
            ))}
          </Select>

          <Input
            placeholder="Search Loan ID / Customer / Bank / Payout ID"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
          />

          {/* Expected Date Filter */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#666" }}>Expected Date:</span>
            <input
              type="date"
              value={expectedFrom}
              onChange={(e) => setExpectedFrom(e.target.value)}
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: "4px 6px",
              }}
            />
            <span style={{ fontSize: 12, color: "#666" }}>to</span>
            <input
              type="date"
              value={expectedTo}
              onChange={(e) => setExpectedTo(e.target.value)}
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: "4px 6px",
              }}
            />
          </div>

          <Button
            onClick={() => {
              setStatusFilter("All");
              setBankFilter("All");
              setSearchText("");
              setExpectedFrom("");
              setExpectedTo("");
            }}
          >
            Clear Filters
          </Button>
        </Space>

        {/* Bulk Bar */}
        {selectedRows.length > 0 && (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #eee",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13 }}>
              Selected: <b>{selectedRows.length}</b>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={() => {
                  setSelectedRowKeys([]);
                  setSelectedRows([]);
                }}
              >
                Clear Selection
              </Button>

              <Button type="primary" onClick={bulkMarkAsReceived}>
                Mark as Received
              </Button>
            </div>
          </div>
        )}

        <Table
          rowKey={(r) => r.payoutId || r.id}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredRows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  );
};

export default PayoutReceivablesDashboard;
