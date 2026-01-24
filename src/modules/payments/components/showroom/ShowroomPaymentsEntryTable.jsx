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
  isVerified = false, // ✅ NEW
}) => {
  const [rows, setRows] = useState([]);

  const exVal = asInt(exchangeValue);
  const insAmt = asInt(insuranceAmount);

  // hydrate from storage only once
  const didHydrateFromStorage = useRef(false);

  // -----------------------------------
  // HYDRATE FROM STORAGE FIRST
  // -----------------------------------
  useEffect(() => {
    if (didHydrateFromStorage.current) return;

    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrateFromStorage.current = true;
    }
  }, [initialRows]);

  // -----------------------------------
  // Init rows only if NOT hydrated
  // -----------------------------------
  useEffect(() => {
    if (isVerified) return;
    if (didHydrateFromStorage.current) return;

    setRows((prev) => {
      if (prev.length > 0) return prev;

      // financed -> auto loan row
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

      // if exchange exists, don't add placeholder
      if (asInt(exchangeValue) > 0) {
        return [];
      }

      // cash -> placeholder
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

  // -----------------------------------
  // Auto add missing Loan row (refresh safe)
  // -----------------------------------
  useEffect(() => {
    if (isVerified) return;
    if (!isFinanced) return;
    if (asInt(loanPaymentPrefill) <= 0) return;

    setRows((prev) => {
      const hasLoanAuto = prev.some(
        (r) => r._auto === true && r.paymentType === "Loan"
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

  // -----------------------------------
  // EXCHANGE AUTO ROW (SYNC WITH DO)
  // Rule:
  // - purchasedBy Showroom => Adjustment row
  // - purchasedBy Autocredits => NO ROW AT ALL
  // -----------------------------------
  useEffect(() => {
    if (isVerified) return;

    setRows((prev) => {
      let next = removeAutoRowsByType(prev, "Exchange Vehicle");

      if (exVal <= 0) return next;

      const purchasedBy = String(exchangePurchasedBy || "").toLowerCase();

      // Autocredits purchase => NO exchange row
      if (purchasedBy === "autocredits") {
        return next;
      }

      next = next.filter((r) => !isBlankPlaceholderRow(r));

      // showroom purchased => adjustment row
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

      // fallback => treat as showroom adjustment
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

  // -----------------------------------
  // INSURANCE AUTO ROW (SYNC WITH DO)
  // Rule:
  // - If insuranceBy is Showroom => NO ROW
  // - If insuranceBy is Autocredits / Customer / Broker => Adjustment row
  // -----------------------------------
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

  // -----------------------------------
  // Push rows upward (for saving)
  // -----------------------------------
  useEffect(() => {
    if (typeof onRowsChange === "function") {
      onRowsChange(rows);
    }
  }, [rows, onRowsChange]);

  // -----------------------------------
  // Actions
  // -----------------------------------
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
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
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

  // -----------------------------------
  // Totals calculation
  // -----------------------------------
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
    <Card style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            Payments Entry (Showroom Account)
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            {isVerified ? (
              <>File Verified ✅ Read-only mode enabled.</>
            ) : (
              <>
                Click <b>Add Payment Entry</b> to add rows.
              </>
            )}
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            disabled={isVerified}
          >
            Add Payment Entry
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
        {rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "#666" }}>
            No payment rows yet. Click <b>Add Payment Entry</b>.
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.id}
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 14,
                padding: 14,
                background: "#fafafa",
                opacity: isVerified ? 0.92 : 1,
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
                  Payment Entry #{idx + 1} {row._auto ? "(Auto)" : ""}
                </div>

                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteRow(row.id)}
                  disabled={isVerified}
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
                  <FieldLabel>Payment Type</FieldLabel>
                  <Select
                    disabled={isVerified}
                    value={row.paymentType || undefined}
                    placeholder="Select"
                    style={{ width: "100%" }}
                    onChange={(val) => onPaymentTypeChange(row.id, val)}
                    options={[
                      { value: "Margin Money", label: "Margin Money" },
                      { value: "Loan", label: "Loan" },
                      { value: "Exchange Vehicle", label: "Exchange Vehicle" },
                      { value: "Insurance", label: "Insurance" },
                      { value: "Commission", label: "Commission" },
                    ]}
                  />
                </FieldBox>

                <FieldBox>
                  <FieldLabel>Payment Made By</FieldLabel>
                  <Select
                    disabled={isVerified}
                    value={row.paymentMadeBy || undefined}
                    placeholder="Select"
                    style={{ width: "100%" }}
                    onChange={(val) =>
                      updateRow(row.id, { paymentMadeBy: val })
                    }
                    options={[
                      { value: "Customer", label: "Customer" },
                      { value: "Autocredits", label: "Autocredits" },
                      { value: "Bank", label: "Bank" },
                    ]}
                  />
                </FieldBox>

                <FieldBox>
                  <FieldLabel>Payment Mode</FieldLabel>
                  <Select
                    disabled={isVerified}
                    value={row.paymentMode || undefined}
                    placeholder="Select"
                    style={{ width: "100%" }}
                    onChange={(val) => updateRow(row.id, { paymentMode: val })}
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
                  <FieldLabel>Payment Amount</FieldLabel>
                  <Input
                    disabled={isVerified}
                    value={row.paymentAmount}
                    placeholder="Amount"
                    onChange={(e) =>
                      updateRow(row.id, { paymentAmount: e.target.value })
                    }
                  />
                </FieldBox>

                <FieldBox>
                  <FieldLabel>Payment Date</FieldLabel>
                  <DatePicker
                    disabled={isVerified}
                    value={row.paymentDate ? dayjs(row.paymentDate) : null}
                    style={{ width: "100%" }}
                    onChange={(d) =>
                      updateRow(row.id, {
                        paymentDate: d ? d.toISOString() : null,
                      })
                    }
                  />
                </FieldBox>

                <FieldBox>
                  <FieldLabel>Transaction Details</FieldLabel>
                  <Input
                    disabled={isVerified}
                    value={row.transactionDetails}
                    placeholder="Txn / UTR / Ref"
                    onChange={(e) =>
                      updateRow(row.id, { transactionDetails: e.target.value })
                    }
                  />
                </FieldBox>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FieldBox>
                  <FieldLabel>Bank Name</FieldLabel>
                  <Input
                    disabled={isVerified}
                    value={row.bankName}
                    placeholder="Bank"
                    onChange={(e) =>
                      updateRow(row.id, { bankName: e.target.value })
                    }
                  />
                </FieldBox>

                <FieldBox>
                  <FieldLabel>Remarks</FieldLabel>
                  <Input
                    disabled={isVerified}
                    value={row.remarks}
                    placeholder="Remarks"
                    onChange={(e) =>
                      updateRow(row.id, { remarks: e.target.value })
                    }
                  />
                </FieldBox>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        Total Entered Amount:{" "}
        <b>₹ {asInt(totalEntered).toLocaleString("en-IN")}</b>
      </div>
    </Card>
  );
};

export default ShowroomPaymentsEntryTable;
