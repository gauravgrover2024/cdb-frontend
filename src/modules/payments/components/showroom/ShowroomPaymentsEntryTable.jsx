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
  paymentType: "",
  paymentMadeBy: "",
  paymentMode: "",
  paymentAmount: "",
  paymentDate: null,
  transactionDetails: "",
  bankName: "",
  remarks: "",
  _auto: false,
  _autoKey: null,
});

const isBlankPlaceholderRow = (r) => {
  return (
    !r._auto &&
    !r.paymentType &&
    !r.paymentMadeBy &&
    !r.paymentMode &&
    !r.paymentAmount &&
    !r.paymentDate &&
    !r.transactionDetails &&
    !r.bankName &&
    !r.remarks
  );
};

const removeAutoRowsByType = (prev, type) =>
  prev.filter((r) => !(r._auto === true && r.paymentType === type));

const ShowroomPaymentsEntryTable = ({
  isFinanced = false,
  loanPaymentPrefill = 0,
  loanDisbursementDate = null,
  exchangeValue = 0,
  purchaseDate = null,
  hypothecationBank = "",
  exchangePurchasedBy = "",
  insuranceAmount = 0,
  insuranceBy = "",
  onTotalsChange,
  onRowsChange,
  initialRows = [],
  isVerified = false,
}) => {
  const [rows, setRows] = useState([]);

  const exVal = asInt(exchangeValue);
  const insAmt = asInt(insuranceAmount);

  const didHydrateFromStorage = useRef(false);

  // Hydrate from storage
  useEffect(() => {
    if (didHydrateFromStorage.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrateFromStorage.current = true;
    }
  }, [initialRows]);

  // Init rows
  useEffect(() => {
    if (isVerified) return;
    if (didHydrateFromStorage.current) return;

    setRows((prev) => {
      if (prev.length > 0) return prev;

      if (isFinanced && asInt(loanPaymentPrefill) > 0) {
        return [
          {
            ...emptyRow(),
            _auto: true,
            paymentType: "Loan",
            paymentMadeBy: "Bank",
            paymentMode: "Online Transfer/UPI",
            paymentAmount: String(asInt(loanPaymentPrefill)),
            paymentDate: loanDisbursementDate
              ? dayjs(loanDisbursementDate).toISOString()
              : null,
            bankName: hypothecationBank || "",
            remarks: "Auto Loan entry",
          },
        ];
      }

      if (asInt(exchangeValue) > 0) {
        return [];
      }

      return [emptyRow()];
    });
  }, [
    isVerified,
    isFinanced,
    loanPaymentPrefill,
    loanDisbursementDate,
    hypothecationBank,
    exchangeValue,
  ]);

  // Auto add missing Loan row
  useEffect(() => {
    if (isVerified) return;
    if (!isFinanced) return;
    if (asInt(loanPaymentPrefill) <= 0) return;

    setRows((prev) => {
      const hasLoanAuto = prev.some(
        (r) => r._auto === true && r.paymentType === "Loan",
      );
      if (hasLoanAuto) return prev;

      const cleanedPrev = prev.filter((r) => !isBlankPlaceholderRow(r));

      return [
        {
          ...emptyRow(),
          _auto: true,
          paymentType: "Loan",
          paymentMadeBy: "Bank",
          paymentMode: "Online Transfer/UPI",
          paymentAmount: String(asInt(loanPaymentPrefill)),
          paymentDate: loanDisbursementDate
            ? dayjs(loanDisbursementDate).toISOString()
            : null,
          bankName: hypothecationBank || "",
          remarks: "Auto Loan entry",
        },
        ...cleanedPrev,
      ];
    });
  }, [
    isVerified,
    isFinanced,
    loanPaymentPrefill,
    loanDisbursementDate,
    hypothecationBank,
  ]);

  // Exchange auto row
  useEffect(() => {
    if (isVerified) return;

    setRows((prev) => {
      let next = removeAutoRowsByType(prev, "Exchange Vehicle");

      if (exVal <= 0) return next;

      const purchasedBy = String(exchangePurchasedBy || "").toLowerCase();

      if (purchasedBy === "autocredits") {
        return next;
      }

      next = next.filter((r) => !isBlankPlaceholderRow(r));

      if (purchasedBy === "showroom") {
        return [
          ...next,
          {
            ...emptyRow(),
            _auto: true,
            paymentType: "Exchange Vehicle",
            paymentMadeBy: "Customer",
            paymentMode: "Adjustment",
            paymentAmount: String(exVal),
            paymentDate: purchaseDate
              ? dayjs(purchaseDate).toISOString()
              : null,
            remarks: "Auto exchange adjustment (Purchased by Showroom)",
          },
        ];
      }

      return [
        ...next,
        {
          ...emptyRow(),
          _auto: true,
          paymentType: "Exchange Vehicle",
          paymentMadeBy: "Customer",
          paymentMode: "Adjustment",
          paymentAmount: String(exVal),
          paymentDate: purchaseDate ? dayjs(purchaseDate).toISOString() : null,
          remarks: "Auto exchange adjustment entry",
        },
      ];
    });
  }, [isVerified, exVal, purchaseDate, exchangePurchasedBy]);

  // Insurance auto row
  useEffect(() => {
    if (isVerified) return;

    const insuranceAmt = asInt(insuranceAmount);
    const by = String(insuranceBy || "").toLowerCase();

    const needsAdjustment = insuranceAmt > 0 && by && by !== "showroom";

    setRows((prev) => {
      const cleanedPrev = prev.filter((r) => r._autoKey !== "AUTO_INSURANCE");

      if (!needsAdjustment) {
        return cleanedPrev;
      }

      return [
        ...cleanedPrev,
        {
          ...emptyRow(),
          _auto: true,
          _autoKey: "AUTO_INSURANCE",
          paymentType: "Insurance",
          paymentMadeBy: "",
          paymentMode: "Adjustment",
          paymentAmount: String(insuranceAmt),
          paymentDate: null,
          remarks: "Auto insurance adjustment entry from DO details",
        },
      ];
    });
  }, [isVerified, insuranceAmount, insuranceBy]);

  // Push rows upward
  useEffect(() => {
    if (typeof onRowsChange === "function") {
      onRowsChange(rows);
    }
  }, [rows, onRowsChange]);

  const handleAddRow = () => {
    if (isVerified) return;
    setRows((prev) => [...prev, emptyRow()]);
  };

  const handleDeleteRow = (rowId) => {
    if (isVerified) return;

    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== rowId);
    });
  };

  const updateRow = (rowId, patch) => {
    if (isVerified) return;

    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    );
  };

  const onPaymentTypeChange = (rowId, val) => {
    if (isVerified) return;

    if (val === "Loan") {
      updateRow(rowId, {
        paymentType: val,
        paymentMadeBy: "Bank",
        paymentMode: "Online Transfer/UPI",
        bankName: hypothecationBank || "",
        paymentAmount: loanPaymentPrefill
          ? String(asInt(loanPaymentPrefill))
          : "",
        paymentDate: loanDisbursementDate
          ? dayjs(loanDisbursementDate).toISOString()
          : null,
      });
      return;
    }

    if (val === "Exchange Vehicle") {
      const purchasedBy = String(exchangePurchasedBy || "").toLowerCase();

      if (purchasedBy === "showroom") {
        updateRow(rowId, {
          paymentType: val,
          paymentMadeBy: "Customer",
          paymentMode: "Adjustment",
          paymentAmount: exVal ? String(exVal) : "",
          paymentDate: purchaseDate ? dayjs(purchaseDate).toISOString() : null,
        });
        return;
      }

      if (purchasedBy === "autocredits") {
        updateRow(rowId, {
          paymentType: val,
          paymentMadeBy: "",
          paymentMode: "",
          paymentAmount: exVal ? String(exVal) : "",
          paymentDate: purchaseDate ? dayjs(purchaseDate).toISOString() : null,
        });
        return;
      }

      updateRow(rowId, {
        paymentType: val,
        paymentMadeBy: "Customer",
        paymentMode: "Adjustment",
        paymentAmount: exVal ? String(exVal) : "",
      });
      return;
    }

    if (val === "Insurance") {
      updateRow(rowId, {
        paymentType: val,
        paymentMadeBy: "",
        paymentMode: "Adjustment",
        paymentAmount: insAmt ? String(insAmt) : "",
        paymentDate: null,
        remarks: "Insurance entry",
      });
      return;
    }

    if (val === "Commission") {
      updateRow(rowId, {
        paymentType: val,
        paymentMadeBy: "",
        paymentMode: "Cash",
        paymentAmount: "",
        paymentDate: null,
        remarks: "Commission received",
      });
      return;
    }

    updateRow(rowId, { paymentType: val });
  };

  // Totals calculation
  const totals = useMemo(() => {
    let paymentAmountLoan = 0;
    let paymentAmountAutocredits = 0;
    let paymentAmountCustomer = 0;
    let paymentAdjustmentExchangeApplied = 0;
    let paymentAdjustmentInsuranceApplied = 0;
    let paymentAmountMarginMoney = 0;
    let paymentCommissionReceived = 0;

    rows.forEach((r) => {
      const amt = asInt(r.paymentAmount);

      if (r.paymentType === "Loan") {
        paymentAmountLoan += amt;
        return;
      }

      if (
        r.paymentType === "Exchange Vehicle" &&
        r.paymentMode === "Adjustment"
      ) {
        paymentAdjustmentExchangeApplied += amt;
        return;
      }

      if (r.paymentType === "Insurance" && r.paymentMode === "Adjustment") {
        paymentAdjustmentInsuranceApplied += amt;
        return;
      }

      if (r.paymentType === "Margin Money") {
        paymentAmountMarginMoney += amt;
      }

      if (r.paymentType === "Commission") {
        paymentCommissionReceived += amt;
        return;
      }

      if (r.paymentMadeBy === "Autocredits") paymentAmountAutocredits += amt;
      if (r.paymentMadeBy === "Customer") paymentAmountCustomer += amt;
    });

    return {
      paymentAmountLoan,
      paymentAmountAutocredits,
      paymentAmountCustomer,
      paymentAdjustmentExchangeApplied,
      paymentAdjustmentInsuranceApplied,
      paymentAmountMarginMoney,
      paymentCommissionReceived,
    };
  }, [rows]);

  useEffect(() => {
    if (typeof onTotalsChange === "function") {
      onTotalsChange(totals);
    }
  }, [totals, onTotalsChange]);

  const totalEntered = useMemo(() => {
    return rows.reduce((sum, r) => sum + asInt(r.paymentAmount), 0);
  }, [rows]);

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
            Payment Entries
          </div>
          <div style={{ fontSize: 12, color: "#86868b" }}>
            {isVerified
              ? "Account verified — read-only mode"
              : `${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRow}
          disabled={isVerified}
          style={{
            height: 36,
            borderRadius: 10,
            fontWeight: 600,
            background: "#007aff",
            borderColor: "transparent",
          }}
        >
          Add Entry
        </Button>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#86868b",
              fontSize: 13,
            }}
          >
            No payment entries yet. Click "Add Entry" to begin.
          </div>
        ) : (
          rows.map((row, idx) => (
            <EntryCard
              key={row.id}
              row={row}
              index={idx}
              isVerified={isVerified}
              onDelete={() => handleDeleteRow(row.id)}
              onUpdate={(patch) => updateRow(row.id, patch)}
              onPaymentTypeChange={(val) => onPaymentTypeChange(row.id, val)}
            />
          ))
        )}
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
            Total Entered
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#1d1d1f",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ₹ {totalEntered.toLocaleString("en-IN")}
          </div>
        </div>
      )}
    </div>
  );
};

const EntryCard = ({
  row,
  index,
  isVerified,
  onDelete,
  onUpdate,
  onPaymentTypeChange,
}) => {
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#007aff",
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
          {row._auto && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#ff9500",
                letterSpacing: "0.5px",
              }}
            >
              Auto-Generated
            </div>
          )}
        </div>

        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={onDelete}
          disabled={isVerified}
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
        <FieldInput label="Payment Type">
          <Select
            value={row.paymentType || undefined}
            placeholder="Select type"
            onChange={onPaymentTypeChange}
            disabled={isVerified}
            style={{ width: "100%" }}
            options={[
              { value: "Margin Money", label: "Margin Money" },
              { value: "Loan", label: "Loan" },
              { value: "Exchange Vehicle", label: "Exchange Vehicle" },
              { value: "Insurance", label: "Insurance" },
              { value: "Commission", label: "Commission" },
            ]}
          />
        </FieldInput>

        <FieldInput label="Made By">
          <Select
            value={row.paymentMadeBy || undefined}
            placeholder="Select"
            onChange={(val) => onUpdate({ paymentMadeBy: val })}
            disabled={isVerified}
            style={{ width: "100%" }}
            options={[
              { value: "Customer", label: "Customer" },
              { value: "Autocredits", label: "Autocredits" },
              { value: "Bank", label: "Bank" },
            ]}
          />
        </FieldInput>

        <FieldInput label="Mode">
          <Select
            value={row.paymentMode || undefined}
            placeholder="Select"
            onChange={(val) => onUpdate({ paymentMode: val })}
            disabled={isVerified}
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
            value={row.paymentAmount}
            placeholder="0"
            onChange={(e) => onUpdate({ paymentAmount: e.target.value })}
            disabled={isVerified}
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </FieldInput>

        <FieldInput label="Date">
          <DatePicker
            value={row.paymentDate ? dayjs(row.paymentDate) : null}
            onChange={(d) =>
              onUpdate({
                paymentDate: d ? d.toISOString() : null,
              })
            }
            disabled={isVerified}
            style={{ width: "100%" }}
          />
        </FieldInput>

        <FieldInput label="Transaction Ref">
          <Input
            value={row.transactionDetails}
            placeholder="UTR / Ref"
            onChange={(e) => onUpdate({ transactionDetails: e.target.value })}
            disabled={isVerified}
          />
        </FieldInput>

        <FieldInput label="Bank Name">
          <Input
            value={row.bankName}
            placeholder="Bank"
            onChange={(e) => onUpdate({ bankName: e.target.value })}
            disabled={isVerified}
          />
        </FieldInput>

        <FieldInput label="Remarks" fullWidth>
          <Input
            value={row.remarks}
            placeholder="Notes"
            onChange={(e) => onUpdate({ remarks: e.target.value })}
            disabled={isVerified}
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

export default ShowroomPaymentsEntryTable;
