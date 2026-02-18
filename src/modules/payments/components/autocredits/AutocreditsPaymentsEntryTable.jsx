import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Input, DatePicker, Select, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const emptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  receiptTypes: [], // ✅ MULTISELECT
  receiptMode: "",
  receiptAmount: "",
  receiptDate: null,
  transactionDetails: "",
  bankName: "",
  remarks: "",
});

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{children}</div>
);

const FieldBox = ({ children }) => (
  <div
    style={{
      border: "1px solid #f0f0f0",
      borderRadius: 12,
      padding: 10,
      background: "#fff",
    }}
  >
    {children}
  </div>
);

const AutocreditsPaymentsEntryTable = ({
  insuranceReceivable = 0, // pending insurance receivable
  exchangeReceivable = 0, // pending exchange adjustment (for info only)
  marginReceivable = 0, // ✅ net margin + showroom payments - exchange
  onTotalsChange,
  onRowsChange,
  initialRows = [],
  readOnly = false,
}) => {
  const [rows, setRows] = useState([]);
  const didHydrate = useRef(false);

  // hydrate
  useEffect(() => {
    if (didHydrate.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrate.current = true;
    }
  }, [initialRows]);

  // init
  useEffect(() => {
    if (didHydrate.current) return;
    setRows([emptyRow()]);
  }, []);

  // push rows up
  useEffect(() => {
    if (typeof onRowsChange === "function") onRowsChange(rows);
  }, [rows, onRowsChange]);

  const handleAddRow = () => {
    if (readOnly) return;
    setRows((p) => [...p, emptyRow()]);
  };

  const handleDeleteRow = (rowId) => {
    if (readOnly) return;
    setRows((p) => (p.length <= 1 ? p : p.filter((r) => r.id !== rowId)));
  };

  const updateRow = (rowId, patch) => {
    if (readOnly) return;
    setRows((p) => p.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  /**
   * Allocation logic:
   * - Autocredits margin and exchange adjustment are used to compute
   *   marginReceivable (already done in parent) but are NOT directly
   *   shown as receipt types.
   * - For each row amount:
   *   - Only non‑Adjustment rows contribute to receiptAmountTotal.
   *   - Amount is allocated proportionally to selected receiptTypes
   *     among: Insurance, Margin Money, Exchange Vehicle, Commission,
   *     based on their outstanding targets (marginReceivable, insuranceReceivable, etc.).
   */
  const totals = useMemo(() => {
    const breakup = {
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
    };

    let receiptAmountTotal = 0;

    const insuranceTarget = asInt(insuranceReceivable);
    const marginTarget = asInt(marginReceivable);

    rows.forEach((r) => {
      const amt = asInt(r.receiptAmount);
      if (!amt) return;

      const selected = Array.isArray(r.receiptTypes) ? r.receiptTypes : [];
      const isAdjustment = r.receiptMode === "Adjustment";

      // Only non-adjustment rows are CUSTOMER receipts
      if (!isAdjustment) {
        receiptAmountTotal += amt;
      }

      if (!selected.length) return;

      let remaining = amt;

      // 1) Commission-only rows: map straight to Commission
      if (selected.length === 1 && selected.includes("Commission")) {
        breakup.Commission += remaining;
        return;
      }

      // 2) Insurance first
      if (selected.includes("Insurance") && insuranceTarget > 0) {
        const alreadyAllocIns = breakup.Insurance;
        const remainingInsTarget = Math.max(
          0,
          insuranceTarget - alreadyAllocIns
        );
        if (remainingInsTarget > 0 && remaining > 0) {
          const insAlloc = Math.min(remaining, remainingInsTarget);
          breakup.Insurance += insAlloc;
          remaining -= insAlloc;
        }
      }

      // 3) Then Margin Money
      if (remaining > 0 && selected.includes("Margin Money")) {
        const alreadyAllocMargin = breakup["Margin Money"];
        const remainingMarginTarget = Math.max(
          0,
          marginTarget - alreadyAllocMargin
        );
        const marginAlloc =
          remainingMarginTarget > 0
            ? Math.min(remaining, remainingMarginTarget)
            : remaining;

        breakup["Margin Money"] += marginAlloc;
        remaining -= marginAlloc;
      }

      // 4) If Commission is selected along with others and there is still
      //    some remaining amount, send remainder to Commission.
      if (remaining > 0 && selected.includes("Commission")) {
        breakup.Commission += remaining;
        remaining = 0;
      }

      // Exchange Vehicle is not part of allocation anymore; it is handled via DO.
    });

    return {
      receiptAmountTotal,
      receiptBreakup: breakup,
    };
  }, [rows, insuranceReceivable, marginReceivable]);

  useEffect(() => {
    if (typeof onTotalsChange === "function") onTotalsChange(totals);
  }, [totals, onTotalsChange]);

  return (
    <Card style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            Receipts Entry (Autocredits Account)
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            {readOnly ? (
              <b style={{ color: "#1677ff" }}>Verified • Read Only</b>
            ) : (
              <>
                Click <b>Add Receipt Entry</b> to add rows.
              </>
            )}
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            disabled={readOnly}
          >
            Add Receipt Entry
          </Button>
        </Space>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {rows.map((row, idx) => (
          <div
            key={row.id}
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 14,
              padding: 14,
              background: "#fafafa",
              opacity: readOnly ? 0.95 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>
                Receipt Entry #{idx + 1}
              </div>

              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteRow(row.id)}
                disabled={readOnly}
              >
                Delete
              </Button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              <FieldBox>
                <FieldLabel>Receipt Type (Multi Select)</FieldLabel>
                <Select
                  mode="multiple"
                  value={row.receiptTypes}
                  placeholder="Select"
                  style={{ width: "100%" }}
                  onChange={(val) => updateRow(row.id, { receiptTypes: val })}
                  disabled={readOnly}
                  options={[
                    { value: "Insurance", label: "Insurance" },
                    { value: "Margin Money", label: "Margin Money" },
                    { value: "Exchange Vehicle", label: "Exchange Vehicle" },
                    { value: "Commission", label: "Commission" },
                  ]}
                />
              </FieldBox>

              <FieldBox>
                <FieldLabel>Receipt Mode</FieldLabel>
                <Select
                  value={row.receiptMode || undefined}
                  placeholder="Select"
                  style={{ width: "100%" }}
                  onChange={(val) => updateRow(row.id, { receiptMode: val })}
                  disabled={readOnly}
                  options={[
                    {
                      value: "Online Transfer/UPI",
                      label: "Online Transfer/UPI",
                    },
                    { value: "Cash", label: "Cash" },
                    { value: "Cheque", label: "Cheque" },
                    { value: "DD", label: "DD" },
                    { value: "Credit Card", label: "Credit Card" },
                    { value: "Adjustment", label: "Adjustment" },
                  ]}
                />
              </FieldBox>

              <FieldBox>
                <FieldLabel>Receipt Amount</FieldLabel>
                <Input
                  value={row.receiptAmount}
                  placeholder="Amount"
                  onChange={(e) =>
                    updateRow(row.id, { receiptAmount: e.target.value })
                  }
                  disabled={readOnly}
                />
              </FieldBox>

              <FieldBox>
                <FieldLabel>Receipt Date</FieldLabel>
                <DatePicker
                  value={row.receiptDate ? dayjs(row.receiptDate) : null}
                  style={{ width: "100%" }}
                  onChange={(d) =>
                    updateRow(row.id, {
                      receiptDate: d ? d.toISOString() : null,
                    })
                  }
                  disabled={readOnly}
                />
              </FieldBox>

              <FieldBox>
                <FieldLabel>Transaction Details</FieldLabel>
                <Input
                  value={row.transactionDetails}
                  placeholder="Txn / UTR / Ref"
                  onChange={(e) =>
                    updateRow(row.id, { transactionDetails: e.target.value })
                  }
                  disabled={readOnly}
                />
              </FieldBox>

              <FieldBox>
                <FieldLabel>Bank Name</FieldLabel>
                <Input
                  value={row.bankName}
                  placeholder="Bank"
                  onChange={(e) =>
                    updateRow(row.id, { bankName: e.target.value })
                  }
                  disabled={readOnly}
                />
              </FieldBox>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldBox>
                <FieldLabel>Remarks</FieldLabel>
                <Input
                  value={row.remarks}
                  placeholder="Remarks"
                  onChange={(e) =>
                    updateRow(row.id, { remarks: e.target.value })
                  }
                  disabled={readOnly}
                />
              </FieldBox>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        Total Entered Receipt Amount:{" "}
        <b>₹ {asInt(totals.receiptAmountTotal).toLocaleString("en-IN")}</b>
      </div>
    </Card>
  );
};

export default AutocreditsPaymentsEntryTable;
