// src/modules/loans/components/loan-form/payout/PayoutPayablesDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Input, Button, Space, Select } from "antd";
import dayjs from "dayjs";
import Icon from "../../../../../components/AppIcon";

const { Option } = Select;

const TRACKING_KEY = "payoutTracking";

/* ==============================
   Helpers
============================== */
const loadTracking = () => {
  try {
    return JSON.parse(localStorage.getItem(TRACKING_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveTracking = (data) => {
  localStorage.setItem(TRACKING_KEY, JSON.stringify(data));
};

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
  const [tracking, setTracking] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Date filter
  const [expectedFrom, setExpectedFrom] = useState("");
  const [expectedTo, setExpectedTo] = useState("");

  useEffect(() => {
    setTracking(loadTracking());
  }, []);

  const rawRows = useMemo(() => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");

    const flattened = [];

    savedLoans.forEach((loan) => {
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
        const t = tracking[p.payoutId] || {};

        flattened.push({
          key: p.payoutId || p.id,
          payoutId: p.payoutId,
          loanId: loan.loanId || loan.id || "-",
          customerName: getCustomerNameFromLoan(loan),

          dealerName: loan.dealerName || loan.delivery_dealerName || "-",

          payout_type: p.payout_type,
          payout_party_name: p.payout_party_name,
          payout_percentage: p.payout_percentage,
          payout_amount: p.payout_amount,
          tds_amount: p.tds_amount,
          net_amount:
            (Number(p.payout_amount) || 0) - (Number(p.tds_amount) || 0),

          payout_status: t.payout_status || p.payout_status || "Expected",
          payout_expected_date:
            t.payout_expected_date || p.payout_expected_date || "",
          payout_received_date:
            t.payout_received_date || p.payout_received_date || "",
        });
      });
    });

    return flattened;
  }, [tracking]);

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

  const updateTrackingField = (payoutId, field, value) => {
    setTracking((prev) => {
      const next = {
        ...prev,
        [payoutId]: {
          ...(prev[payoutId] || {}),
          [field]: value,
        },
      };
      saveTracking(next);
      return next;
    });
  };

  const bulkMarkPaid = () => {
    if (selectedRowKeys.length === 0) {
      alert("Please select at least one payout to mark as paid.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    setTracking((prev) => {
      const next = { ...prev };

      selectedRowKeys.forEach((payoutId) => {
        next[payoutId] = {
          ...(next[payoutId] || {}),
          payout_status: "Received", // keeping same naming for now
          payout_received_date: today,
        };
      });

      saveTracking(next);
      return next;
    });

    setSelectedRowKeys([]);
    alert("Selected payables marked as Paid ✅");
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
      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      title: "TDS",
      dataIndex: "tds_amount",
      width: 120,
      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
    },
    {
      title: "Net",
      dataIndex: "net_amount",
      width: 140,
      render: (v) => (
        <b style={{ color: "#1677ff" }}>
          ₹{Number(v || 0).toLocaleString("en-IN")}
        </b>
      ),
    },
    {
      title: "Status",
      dataIndex: "payout_status",
      width: 160,
      render: (_, row) => (
        <select
          className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
          value={row.payout_status}
          onChange={(e) => {
            const val = e.target.value;
            updateTrackingField(row.payoutId, "payout_status", val);

            // auto set received date if marked Received
            if (val === "Received" && !row.payout_received_date) {
              updateTrackingField(
                row.payoutId,
                "payout_received_date",
                new Date().toISOString().split("T")[0],
              );
            }

            // clear received date if not Received
            if (val !== "Received") {
              updateTrackingField(row.payoutId, "payout_received_date", "");
            }
          }}
        >
          <option value="Expected">Expected</option>
          <option value="Received">Paid</option>
          <option value="Hold">Hold</option>
        </select>
      ),
    },
    {
      title: "Expected Date",
      dataIndex: "payout_expected_date",
      width: 160,
      render: (_, row) => (
        <input
          type="date"
          className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
          value={row.payout_expected_date || ""}
          onChange={(e) =>
            updateTrackingField(
              row.payoutId,
              "payout_expected_date",
              e.target.value,
            )
          }
        />
      ),
    },
    {
      title: "Paid Date",
      dataIndex: "payout_received_date",
      width: 160,
      render: (_, row) => (
        <input
          type="date"
          className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background"
          value={row.payout_received_date || ""}
          onChange={(e) =>
            updateTrackingField(
              row.payoutId,
              "payout_received_date",
              e.target.value,
            )
          }
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card className="shadow-elevation-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Payout Payables Dashboard</h2>
            <p className="text-xs text-muted-foreground">
              Track payouts to give to Dealer / Source
            </p>
          </div>

          <Button type="primary" onClick={bulkMarkPaid}>
            <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
            Mark Paid (Bulk)
          </Button>
        </div>

        {/* Filters */}
        <Space wrap style={{ width: "100%" }}>
          <Input
            placeholder="Search by Loan ID / Customer / Party / Payout ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
          />

          <Select
            value={statusFilter}
            style={{ width: 160 }}
            onChange={setStatusFilter}
          >
            <Option value="All">All Status</Option>
            <Option value="Expected">Expected</Option>
            <Option value="Received">Paid</Option>
            <Option value="Hold">Hold</Option>
          </Select>

          <Select
            value={typeFilter}
            style={{ width: 160 }}
            onChange={setTypeFilter}
          >
            <Option value="All">All Types</Option>
            <Option value="Dealer">Dealer</Option>
            <Option value="Source">Source</Option>
          </Select>

          <Select
            value={partyFilter}
            style={{ width: 220 }}
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
        </Space>
      </Card>

      <Card className="shadow-elevation-2" style={{ marginTop: 16 }}>
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
      </Card>
    </div>
  );
};

export default PayoutPayablesDashboard;
