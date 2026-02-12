import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, DatePicker, Select } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const emptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  receiptTypes: [],
  receiptMode: "",
  receiptAmount: "",
  receiptDate: null,
  transactionDetails: "",
  bankName: "",
  remarks: "",
});

const AutocreditsPaymentsEntryTable = ({
  insuranceReceivable = 0,
  exchangeReceivable = 0,
  marginReceivable = 0,
  onTotalsChange,
  onRowsChange,
  initialRows = [],
  readOnly = false,
}) => {
  const [rows, setRows] = useState([]);
  const didHydrate = useRef(false);

  // Hydrate
  useEffect(() => {
    if (didHydrate.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrate.current = true;
    }
  }, [initialRows]);

  // Init
  useEffect(() => {
    if (didHydrate.current) return;
    setRows([emptyRow()]);
  }, []);

  // Push rows up
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

      if (!isAdjustment) {
        receiptAmountTotal += amt;
      }

      if (!selected.length) return;

      let remaining = amt;

      // Commission-only
      if (selected.length === 1 && selected.includes("Commission")) {
        breakup.Commission += remaining;
        return;
      }

      // Insurance first
      if (selected.includes("Insurance") && insuranceTarget > 0) {
        const alreadyAllocIns = breakup.Insurance;
        const remainingInsTarget = Math.max(
          0,
          insuranceTarget - alreadyAllocIns,
        );
        if (remainingInsTarget > 0 && remaining > 0) {
          const insAlloc = Math.min(remaining, remainingInsTarget);
          breakup.Insurance += insAlloc;
          remaining -= insAlloc;
        }
      }

      // Margin Money
      if (remaining > 0 && selected.includes("Margin Money")) {
        const alreadyAllocMargin = breakup["Margin Money"];
        const remainingMarginTarget = Math.max(
          0,
          marginTarget - alreadyAllocMargin,
        );
        const marginAlloc =
          remainingMarginTarget > 0
            ? Math.min(remaining, remainingMarginTarget)
            : remaining;

        breakup["Margin Money"] += marginAlloc;
        remaining -= marginAlloc;
      }

      // Commission remainder
      if (remaining > 0 && selected.includes("Commission")) {
        breakup.Commission += remaining;
        remaining = 0;
      }
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
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1d1d1f",
              marginBottom: 4,
            }}
          >
            Receipt Entries
          </div>
          <div style={{ fontSize: 12, color: "#86868b" }}>
            {readOnly
              ? "Account verified — read-only mode"
              : `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRow}
          disabled={readOnly}
          style={{
            height: 36,
            borderRadius: 10,
            fontWeight: 600,
            background: "#007aff",
            borderColor: "transparent",
          }}
        >
          Add Receipt
        </Button>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((row, idx) => (
          <ReceiptCard
            key={row.id}
            row={row}
            index={idx}
            readOnly={readOnly}
            onDelete={() => handleDeleteRow(row.id)}
            onUpdate={(patch) => updateRow(row.id, patch)}
          />
        ))}
      </div>

      {/* Footer Total */}
      {rows.length > 0 && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(0, 0, 0, 0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
            Total Receipts
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#1d1d1f",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ₹ {asInt(totals.receiptAmountTotal).toLocaleString("en-IN")}
          </div>
        </div>
      )}
    </div>
  );
};

const ReceiptCard = ({ row, index, readOnly, onDelete, onUpdate }) => {
  return (
    <div
      style={{
        background: "#f5f5f7",
        borderRadius: 12,
        padding: 20,
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "#34c759",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </div>

        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={onDelete}
          disabled={readOnly}
          style={{ borderRadius: 8 }}
        >
          Remove
        </Button>
      </div>

      {/* Fields Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <FieldInput label="Receipt Type(s)">
          <Select
            mode="multiple"
            value={row.receiptTypes}
            placeholder="Select types"
            onChange={(val) => onUpdate({ receiptTypes: val })}
            disabled={readOnly}
            style={{ width: "100%" }}
            options={[
              { value: "Insurance", label: "Insurance" },
              { value: "Margin Money", label: "Margin Money" },
              { value: "Exchange Vehicle", label: "Exchange Vehicle" },
              { value: "Commission", label: "Commission" },
            ]}
          />
        </FieldInput>

        <FieldInput label="Receipt Mode">
          <Select
            value={row.receiptMode || undefined}
            placeholder="Select"
            onChange={(val) => onUpdate({ receiptMode: val })}
            disabled={readOnly}
            style={{ width: "100%" }}
            options={[
              { value: "Online Transfer/UPI", label: "Online Transfer/UPI" },
              { value: "Cash", label: "Cash" },
              { value: "Cheque", label: "Cheque" },
              { value: "DD", label: "DD" },
              { value: "Credit Card", label: "Credit Card" },
              { value: "Adjustment", label: "Adjustment" },
            ]}
          />
        </FieldInput>

        <FieldInput label="Amount">
          <Input
            value={row.receiptAmount}
            placeholder="0"
            onChange={(e) => onUpdate({ receiptAmount: e.target.value })}
            disabled={readOnly}
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </FieldInput>

        <FieldInput label="Date">
          <DatePicker
            value={row.receiptDate ? dayjs(row.receiptDate) : null}
            onChange={(d) =>
              onUpdate({
                receiptDate: d ? d.toISOString() : null,
              })
            }
            disabled={readOnly}
            style={{ width: "100%" }}
          />
        </FieldInput>

        <FieldInput label="Transaction Ref">
          <Input
            value={row.transactionDetails}
            placeholder="UTR / Ref"
            onChange={(e) => onUpdate({ transactionDetails: e.target.value })}
            disabled={readOnly}
          />
        </FieldInput>

        <FieldInput label="Bank Name">
          <Input
            value={row.bankName}
            placeholder="Bank"
            onChange={(e) => onUpdate({ bankName: e.target.value })}
            disabled={readOnly}
          />
        </FieldInput>

        <FieldInput label="Remarks" fullWidth>
          <Input
            value={row.remarks}
            placeholder="Notes"
            onChange={(e) => onUpdate({ remarks: e.target.value })}
            disabled={readOnly}
          />
        </FieldInput>
      </div>
    </div>
  );
};

const FieldInput = ({ label, children, fullWidth }) => (
  <div style={{ gridColumn: fullWidth ? "1 / -1" : "auto" }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "#86868b",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

export default AutocreditsPaymentsEntryTable;
