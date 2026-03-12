// src/modules/payments/components/showroom/ShowroomPaymentsEntryNew.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoComplete,
  Card,
  Button,
  Input,
  DatePicker,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  BankOutlined,
  UserOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useBankDirectoryOptions } from "../../../../hooks/useBankDirectoryOptions";

const { Text } = Typography;

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
  // cross adjustment extras
  adjustmentDirection: null, // "outgoing" | "incoming"
  crossCaseId: null,
  crossCaseLabel: "",
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
    !r.remarks &&
    !r.crossCaseLabel
  );
};

const removeAutoRowsByType = (prev, type) =>
  prev.filter((r) => !(r._auto === true && r.paymentType === type));

const SectionChip = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      borderRadius: 999,
      padding: "4px 10px",
      border: active ? "1px solid #3b82f6" : "1px solid #e5e7eb",
      background: active ? "#eff6ff" : "#ffffff",
      fontSize: 11,
      color: active ? "#1d4ed8" : "#4b5563",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
    }}
  >
    <span>{label}</span>
    <span
      style={{
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 999,
        background: active ? "#dbeafe" : "#f3f4f6",
      }}
    >
      {count}
    </span>
  </button>
);

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const ShowroomPaymentsEntryNew = ({
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
  /**
   * Optional async loader for other cases used by Cross Adjustment.
   * Signature: (searchText) => Promise<Array<{ value, label }>>
   * Example label: "DO-123 | DL01AB1234 | Raj"
   */
  loadCaseOptions,
}) => {
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();
  const [rows, setRows] = useState([]);
  const [activeSection, setActiveSection] = useState("ALL");
  const [editingRowId, setEditingRowId] = useState(null);

  const exVal = asInt(exchangeValue);
  const insAmt = asInt(insuranceAmount);

  const didHydrateFromStorage = useRef(false);

  // ---------- HYDRATE FROM INITIAL ----------
  useEffect(() => {
    if (didHydrateFromStorage.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrateFromStorage.current = true;
    }
  }, [initialRows]);

  // ---------- INITIAL AUTO SETUP ----------
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
            remarks: "Auto loan entry",
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

  // ---------- ENSURE AUTO LOAN ROW ----------
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
          remarks: "Auto loan entry",
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

  // ---------- EXCHANGE AUTO ROW ----------
  useEffect(() => {
    if (isVerified) return;

    setRows((prev) => {
      let next = removeAutoRowsByType(prev, "Exchange Vehicle");
      if (exVal <= 0) return next;

      const purchasedBy = String(exchangePurchasedBy || "").toLowerCase();
      if (purchasedBy === "autocredits") return next;

      next = next.filter((r) => !isBlankPlaceholderRow(r));

      const base = {
        ...emptyRow(),
        _auto: true,
        paymentType: "Exchange Vehicle",
        paymentMadeBy: "Customer",
        paymentMode: "Adjustment",
        paymentAmount: String(exVal),
        paymentDate: purchaseDate ? dayjs(purchaseDate).toISOString() : null,
        remarks: "Auto exchange adjustment (purchased by showroom)",
      };

      if (purchasedBy && purchasedBy !== "showroom") {
        base.remarks = "Auto exchange adjustment entry";
      }

      return [...next, base];
    });
  }, [isVerified, exVal, purchaseDate, exchangePurchasedBy]);

  // ---------- INSURANCE AUTO ROW ----------
  useEffect(() => {
    if (isVerified) return;

    const insuranceAmt = asInt(insuranceAmount);
    const by = String(insuranceBy || "").toLowerCase();
    const needsAdjustment = insuranceAmt > 0 && by && by !== "showroom";

    setRows((prev) => {
      const cleanedPrev = prev.filter((r) => r._autoKey !== "AUTO_INSURANCE");
      if (!needsAdjustment) return cleanedPrev;

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

  // ---------- PUSH ROWS UP ----------
  useEffect(() => {
    if (typeof onRowsChange === "function") onRowsChange(rows);
  }, [rows, onRowsChange]);

  // ---------- ACTIONS ----------
  const handleAddRow = () => {
    if (isVerified) return;
    const newRow = emptyRow();
    setRows((prev) => [...prev, newRow]);
    setEditingRowId(newRow.id);
  };

  const handleDeleteRow = (rowId) => {
    if (isVerified) return;
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== rowId);
    });
    setEditingRowId((prev) => (prev === rowId ? null : prev));
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

    if (val === "Cross Adjustment") {
      updateRow(rowId, {
        paymentType: val,
        paymentMode: "Adjustment",
        paymentMadeBy: "",
        bankName: "",
        adjustmentDirection: "outgoing",
        remarks: "Cross adjustment given to another case",
      });
      return;
    }

    updateRow(rowId, { paymentType: val });
  };

  // ---------- TOTALS ----------
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
    if (typeof onTotalsChange === "function") onTotalsChange(totals);
  }, [totals, onTotalsChange]);

  const totalEntered = useMemo(
    () => rows.reduce((sum, r) => sum + asInt(r.paymentAmount), 0),
    [rows],
  );

  // ---------- FILTERED VIEW ----------
  const sectionCounts = useMemo(() => {
    const counts = {
      ALL: rows.length,
      "Margin Money": 0,
      Loan: 0,
      "Exchange Vehicle": 0,
      Insurance: 0,
      Commission: 0,
      "Cross Adjustment": 0,
      OTHER: 0,
    };
    rows.forEach((r) => {
      const t = r.paymentType || "OTHER";
      if (counts[t] !== undefined) counts[t] += 1;
      else counts.OTHER += 1;
    });
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeSection === "ALL") return rows;
    if (activeSection === "OTHER")
      return rows.filter(
        (r) =>
          ![
            "Margin Money",
            "Loan",
            "Exchange Vehicle",
            "Insurance",
            "Commission",
            "Cross Adjustment",
          ].includes(r.paymentType),
      );
    return rows.filter((r) => r.paymentType === activeSection);
  }, [rows, activeSection]);

  // ---------- AUTOSUGGEST STATE (per row) ----------
  const [caseOptionsCache, setCaseOptionsCache] = useState({}); // rowId -> options

  const handleSearchCases = async (rowId, search) => {
    if (!loadCaseOptions) return;
    try {
      const opts = await loadCaseOptions(search);
      setCaseOptionsCache((prev) => ({
        ...prev,
        [rowId]: opts || [],
      }));
    } catch (e) {
      // fail silently; you can add message.warning here if needed
    }
  };

  // ---------- RENDER ----------
  return (
    <Card
      style={{
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
      }}
      bodyStyle={{ padding: 12 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.14,
              color: "#6b7280",
            }}
          >
            Showroom account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            Payments timeline
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
            {isVerified ? (
              <>Verified ✅ Read-only mode enabled.</>
            ) : (
              <>
                Click a row to expand, or <b>Add payment entry</b> to create a
                new one.
              </>
            )}
          </div>
        </div>

        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total entered: <b>{money(totalEntered)}</b>
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            disabled={isVerified}
          >
            Add payment entry
          </Button>
        </Space>
      </div>

      {/* Section chips */}
      <div
        style={{
          marginTop: 6,
          marginBottom: 10,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <SectionChip
          label="All"
          count={sectionCounts.ALL}
          active={activeSection === "ALL"}
          onClick={() => setActiveSection("ALL")}
        />
        <SectionChip
          label="Margin money"
          count={sectionCounts["Margin Money"]}
          active={activeSection === "Margin Money"}
          onClick={() => setActiveSection("Margin Money")}
        />
        <SectionChip
          label="Loan"
          count={sectionCounts.Loan}
          active={activeSection === "Loan"}
          onClick={() => setActiveSection("Loan")}
        />
        <SectionChip
          label="Exchange"
          count={sectionCounts["Exchange Vehicle"]}
          active={activeSection === "Exchange Vehicle"}
          onClick={() => setActiveSection("Exchange Vehicle")}
        />
        <SectionChip
          label="Insurance"
          count={sectionCounts.Insurance}
          active={activeSection === "Insurance"}
          onClick={() => setActiveSection("Insurance")}
        />
        <SectionChip
          label="Commission"
          count={sectionCounts.Commission}
          active={activeSection === "Commission"}
          onClick={() => setActiveSection("Commission")}
        />
        <SectionChip
          label="Cross adj."
          count={sectionCounts["Cross Adjustment"]}
          active={activeSection === "Cross Adjustment"}
          onClick={() => setActiveSection("Cross Adjustment")}
        />
        <SectionChip
          label="Other"
          count={sectionCounts.OTHER}
          active={activeSection === "OTHER"}
          onClick={() => setActiveSection("OTHER")}
        />
      </div>

      {/* Compact list with inline expansion */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filteredRows.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            No payment rows in this section.
          </div>
        ) : (
          filteredRows.map((row) => {
            const icon =
              row.paymentType === "Loan" ? (
                <BankOutlined />
              ) : row.paymentType === "Exchange Vehicle" ? (
                <SwapOutlined />
              ) : (
                <UserOutlined />
              );
            const isEditing = editingRowId === row.id;

            return (
              <div key={row.id}>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    cursor: isVerified ? "default" : "pointer",
                  }}
                  onClick={() =>
                    !isVerified &&
                    setEditingRowId((prev) => (prev === row.id ? null : row.id))
                  }
                >
                  {/* Left: main info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1d4ed8",
                        fontSize: 14,
                      }}
                    >
                      {icon}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {row.paymentType || "Payment entry"}{" "}
                        {row._auto && (
                          <Tag
                            color="blue"
                            style={{ marginLeft: 4, fontSize: 10 }}
                          >
                            Auto
                          </Tag>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {row.paymentType === "Cross Adjustment" ? (
                          <>
                            {row.adjustmentDirection === "incoming"
                              ? "From another case"
                              : "To another case"}
                          </>
                        ) : (
                          <>
                            {row.paymentMadeBy && (
                              <span>{row.paymentMadeBy}</span>
                            )}
                            {row.paymentMode && (
                              <span>· {row.paymentMode}</span>
                            )}
                          </>
                        )}
                        {row.paymentDate && (
                          <span>
                            · {dayjs(row.paymentDate).format("DD MMM YYYY")}
                          </span>
                        )}
                      </div>
                      {(row.remarks ||
                        row.crossCaseLabel ||
                        row.transactionDetails) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#4b5563",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 260,
                          }}
                        >
                          {row.crossCaseLabel ||
                            row.remarks ||
                            row.transactionDetails}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111827",
                        minWidth: 100,
                        textAlign: "right",
                      }}
                    >
                      {row.paymentAmount ? money(row.paymentAmount) : "—"}
                    </div>
                    {!isVerified && (
                      <Space size="small">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRowId((prev) =>
                              prev === row.id ? null : row.id,
                            );
                          }}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRow(row.id);
                          }}
                        />
                      </Space>
                    )}
                  </div>
                </div>

                {/* Inline expanded editor */}
                {isEditing && !isVerified && (
                  <div
                    style={{
                      marginTop: 6,
                      marginBottom: 4,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    {row.paymentType === "Cross Adjustment" ? (
                      <>
                        {/* Cross adjustment compact grid */}
                        <div
                          style={{
                            marginBottom: 10,
                            padding: 10,
                            borderRadius: 10,
                            border: "1px dashed #c7d2fe",
                            background: "#f3f4ff",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#4b5563",
                              marginBottom: 6,
                              fontWeight: 500,
                            }}
                          >
                            Cross adjustment details
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.4fr 1.8fr 0.8fr",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginBottom: 4,
                                }}
                              >
                                Direction
                              </div>
                              <Select
                                value={row.adjustmentDirection || "outgoing"}
                                onChange={(val) =>
                                  updateRow(row.id, {
                                    adjustmentDirection: val,
                                    remarks:
                                      row.remarks &&
                                      !row.remarks.startsWith(
                                        "Cross adjustment",
                                      )
                                        ? row.remarks
                                        : val === "outgoing"
                                          ? "Cross adjustment given to another case"
                                          : "Cross adjustment received from another case",
                                  })
                                }
                                style={{ width: "100%" }}
                                options={[
                                  {
                                    value: "outgoing",
                                    label: "From this case to another case",
                                  },
                                  {
                                    value: "incoming",
                                    label: "From another case to this case",
                                  },
                                ]}
                              />
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginBottom: 4,
                                }}
                              >
                                Other case
                              </div>
                              <Select
                                showSearch
                                allowClear
                                placeholder="Search / select case"
                                value={
                                  row.crossCaseId ? row.crossCaseId : undefined
                                }
                                style={{ width: "100%" }}
                                filterOption={false}
                                onSearch={(value) =>
                                  handleSearchCases(row.id, value)
                                }
                                onChange={(val, option) => {
                                  const label =
                                    option?.label || row.crossCaseLabel || "";
                                  updateRow(row.id, {
                                    crossCaseId: val || null,
                                    crossCaseLabel:
                                      label || row.crossCaseLabel || "",
                                    remarks:
                                      row.remarks &&
                                      !row.remarks.startsWith(
                                        "Cross adjustment",
                                      )
                                        ? row.remarks
                                        : row.adjustmentDirection === "incoming"
                                          ? `Cross adjustment received from ${
                                              label || "another case"
                                            }`
                                          : `Cross adjustment given to ${
                                              label || "another case"
                                            }`,
                                  });
                                }}
                                options={caseOptionsCache[row.id] || []}
                                disabled={!loadCaseOptions}
                              />
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginBottom: 4,
                                }}
                              >
                                Amount
                              </div>
                              <Input
                                value={row.paymentAmount}
                                placeholder="Amount"
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    paymentAmount: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1.5fr",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Effective date
                            </div>
                            <DatePicker
                              value={
                                row.paymentDate ? dayjs(row.paymentDate) : null
                              }
                              style={{ width: "100%" }}
                              onChange={(d) =>
                                updateRow(row.id, {
                                  paymentDate: d ? d.toISOString() : null,
                                })
                              }
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Remarks
                            </div>
                            <Input
                              value={row.remarks}
                              placeholder="Reason / note for cross adjustment"
                              onChange={(e) =>
                                updateRow(row.id, {
                                  remarks: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* Payment type selector shown so user can switch back if needed */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment type
                            </div>
                            <Select
                              value={row.paymentType || undefined}
                              placeholder="Select"
                              style={{ width: "100%" }}
                              onChange={(val) =>
                                onPaymentTypeChange(row.id, val)
                              }
                              options={[
                                {
                                  value: "Margin Money",
                                  label: "Margin Money",
                                },
                                { value: "Loan", label: "Loan" },
                                {
                                  value: "Exchange Vehicle",
                                  label: "Exchange Vehicle",
                                },
                                {
                                  value: "Insurance",
                                  label: "Insurance",
                                },
                                {
                                  value: "Commission",
                                  label: "Commission",
                                },
                                {
                                  value: "Cross Adjustment",
                                  label: "Cross Adjustment",
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Normal editor (unchanged) */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment type
                            </div>
                            <Select
                              value={row.paymentType || undefined}
                              placeholder="Select"
                              style={{ width: "100%" }}
                              onChange={(val) =>
                                onPaymentTypeChange(row.id, val)
                              }
                              options={[
                                {
                                  value: "Margin Money",
                                  label: "Margin Money",
                                },
                                { value: "Loan", label: "Loan" },
                                {
                                  value: "Exchange Vehicle",
                                  label: "Exchange Vehicle",
                                },
                                {
                                  value: "Insurance",
                                  label: "Insurance",
                                },
                                {
                                  value: "Commission",
                                  label: "Commission",
                                },
                                {
                                  value: "Cross Adjustment",
                                  label: "Cross Adjustment",
                                },
                              ]}
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment made by
                            </div>
                            <Select
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
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment mode
                            </div>
                            <Select
                              value={row.paymentMode || undefined}
                              placeholder="Select"
                              style={{ width: "100%" }}
                              onChange={(val) =>
                                updateRow(row.id, { paymentMode: val })
                              }
                              options={[
                                {
                                  value: "Online Transfer/UPI",
                                  label: "Online Transfer/UPI",
                                },
                                { value: "Cash", label: "Cash" },
                                { value: "Cheque", label: "Cheque" },
                                { value: "DD", label: "DD" },
                                {
                                  value: "Credit Card",
                                  label: "Credit Card",
                                },
                                {
                                  value: "Adjustment",
                                  label: "Adjustment",
                                },
                              ]}
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment amount
                            </div>
                            <Input
                              value={row.paymentAmount}
                              placeholder="Amount"
                              onChange={(e) =>
                                updateRow(row.id, {
                                  paymentAmount: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Payment date
                            </div>
                            <DatePicker
                              value={
                                row.paymentDate ? dayjs(row.paymentDate) : null
                              }
                              style={{ width: "100%" }}
                              onChange={(d) =>
                                updateRow(row.id, {
                                  paymentDate: d ? d.toISOString() : null,
                                })
                              }
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginBottom: 4,
                              }}
                            >
                              Bank name
                            </div>
                            <AutoComplete
                              value={row.bankName}
                              options={bankDirectoryOptions}
                              placeholder="Bank"
                              filterOption={(inputValue, option) =>
                                String(option?.value || "")
                                  .toUpperCase()
                                  .includes(String(inputValue || "").toUpperCase())
                              }
                              onChange={(value) =>
                                updateRow(row.id, {
                                  bankName: value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                              marginBottom: 4,
                            }}
                          >
                            Transaction details
                          </div>
                          <Input
                            value={row.transactionDetails}
                            placeholder="Txn / UTR / Ref"
                            onChange={(e) =>
                              updateRow(row.id, {
                                transactionDetails: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                              marginBottom: 4,
                            }}
                          >
                            Remarks
                          </div>
                          <Input
                            value={row.remarks}
                            placeholder="Remarks"
                            onChange={(e) =>
                              updateRow(row.id, {
                                remarks: e.target.value,
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default ShowroomPaymentsEntryNew;
