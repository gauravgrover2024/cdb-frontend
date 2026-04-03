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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  BankOutlined,
  SwapOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useBankDirectoryOptions } from "../../../../hooks/useBankDirectoryOptions";
import { useTheme } from "../../../../context/ThemeContext";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const norm = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const sanitizeAmountInput = (value) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/^0+(?=\d)/, "");
};

const formatAmountInput = (value) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-IN");
};

const emptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  receiptTypes: [],
  insurancePaymentMadeBy: "",
  receiptMode: "",
  receiptAmount: "",
  receiptDate: null,
  transactionDetails: "",
  bankName: "",
  remarks: "",
  _auto: false,
  _autoKey: null,
});

const isMeaningfulAutocreditsRow = (row = {}) => {
  if (!row || typeof row !== "object") return false;
  if (row?._auto) return true;
  const amount = asInt(row?.receiptAmount || 0);
  return Boolean(
    amount > 0 ||
      (Array.isArray(row?.receiptTypes) && row.receiptTypes.length > 0) ||
      String(row?.insurancePaymentMadeBy || "").trim() ||
      String(row?.receiptMode || "").trim() ||
      row?.receiptDate ||
      String(row?.transactionDetails || "").trim() ||
      String(row?.bankName || "").trim() ||
      String(row?.remarks || "").trim(),
  );
};

const isInsuranceCustomerAdjustment = (row = {}) => {
  const types = Array.isArray(row?.receiptTypes) ? row.receiptTypes : [];
  return types.includes("Insurance") && norm(row?.insurancePaymentMadeBy) === "customer";
};

const SectionChip = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      borderRadius: 999,
      padding: "5px 11px",
      border: active
        ? "1px solid var(--apt-accent-border)"
        : "1px solid var(--apt-border)",
      background: active ? "var(--apt-accent-soft)" : "var(--apt-card)",
      fontSize: 11,
      color: active ? "var(--apt-accent-text)" : "var(--apt-muted-strong)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      boxShadow: active
        ? "0 0 0 1px color-mix(in srgb, var(--apt-accent-border) 24%, transparent)"
        : "none",
      transition: "all 0.2s ease",
    }}
  >
    <span>{label}</span>
    <span
      style={{
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 999,
        background: active
          ? "var(--apt-accent-soft-2)"
          : "var(--apt-chip-count-bg)",
      }}
    >
      {count}
    </span>
  </button>
);

const getIconForRow = (row) => {
  const types = Array.isArray(row.receiptTypes) ? row.receiptTypes : [];
  if (types.includes("Insurance")) return <BankOutlined />;
  if (types.includes("Exchange Vehicle")) return <SwapOutlined />;
  return <UserOutlined />;
};

const getRowTheme = (row, isDarkMode) => {
  const types = Array.isArray(row?.receiptTypes) ? row.receiptTypes : [];
  if (types.includes("Commission")) {
    return isDarkMode
      ? { border: "#fbbf24", soft: "#3a2b14", text: "#fcd34d", amount: "#fcd34d" }
      : { border: "#b45309", soft: "#fef3c7", text: "#b45309", amount: "#b45309" };
  }
  if (isInsuranceCustomerAdjustment(row)) {
    return isDarkMode
      ? { border: "#f97316", soft: "#3f2a14", text: "#fdba74", amount: "#fdba74" }
      : { border: "#ea580c", soft: "#fff7ed", text: "#c2410c", amount: "#c2410c" };
  }
  if (types.includes("Insurance")) {
    return isDarkMode
      ? { border: "#38bdf8", soft: "#122b3a", text: "#7dd3fc", amount: "#7dd3fc" }
      : { border: "#0369a1", soft: "#e0f2fe", text: "#0369a1", amount: "#0369a1" };
  }
  if (types.includes("Exchange Vehicle")) {
    return isDarkMode
      ? { border: "#a78bfa", soft: "#2b1f4b", text: "#c4b5fd", amount: "#c4b5fd" }
      : { border: "#6d28d9", soft: "#ede9fe", text: "#6d28d9", amount: "#6d28d9" };
  }
  return isDarkMode
    ? { border: "#60a5fa", soft: "#172554", text: "#93c5fd", amount: "#93c5fd" }
    : { border: "#1d4ed8", soft: "#dbeafe", text: "#1d4ed8", amount: "#1d4ed8" };
};

const AutocreditsPaymentsEntryTable = ({
  insuranceReceivable = 0,
  exchangeReceivable = 0,
  marginReceivable = 0,
  onTotalsChange,
  onRowsChange,
  initialRows = [],
  readOnly = false,
}) => {
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();
  const { isDarkMode } = useTheme();
  const [rows, setRows] = useState([]);
  const [activeSection, setActiveSection] = useState("ALL");
  const [editingRowId, setEditingRowId] = useState(null);
  const didHydrate = useRef(false);

  useEffect(() => {
    if (didHydrate.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      const cleaned = initialRows.filter(isMeaningfulAutocreditsRow);
      setRows(cleaned);
      didHydrate.current = true;
      return;
    }
    setRows([]);
    didHydrate.current = true;
  }, [initialRows]);

  useEffect(() => {
    if (typeof onRowsChange === "function") {
      onRowsChange((rows || []).filter(isMeaningfulAutocreditsRow));
    }
  }, [rows, onRowsChange]);

  const updateRow = (rowId, patch) => {
    if (readOnly) return;
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const handleDeleteRow = (rowId) => {
    if (readOnly) return;
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next;
    });
    setEditingRowId((prev) => (prev === rowId ? null : prev));
  };

  const handleAddRow = () => {
    if (readOnly) return;
    const newRow = emptyRow();
    setRows((prev) => [...prev, newRow]);
    setEditingRowId(newRow.id);
  };

  const handleDuplicateRow = (rowId) => {
    if (readOnly) return;
    setRows((prev) => {
      const idx = prev.findIndex((row) => row.id === rowId);
      if (idx < 0) return prev;
      const source = prev[idx];
      const clone = {
        ...source,
        id: `${Date.now()}-${Math.random()}`,
        _auto: false,
        _autoKey: null,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      setEditingRowId(clone.id);
      return next;
    });
  };

  const totals = useMemo(() => {
    const breakup = {
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
    };

    const insuranceTarget = asInt(insuranceReceivable);
    const marginTarget = asInt(marginReceivable);

    let receiptAmountTotal = 0;
    let insuranceAdjustmentTotal = 0;

    (rows || []).forEach((row) => {
      const amount = asInt(row?.receiptAmount || 0);
      if (!amount) return;
      const types = Array.isArray(row?.receiptTypes) ? row.receiptTypes : [];
      const customerInsuranceAdjustment = isInsuranceCustomerAdjustment(row);

      if (customerInsuranceAdjustment) {
        insuranceAdjustmentTotal += amount;
        return;
      }

      receiptAmountTotal += amount;
      if (!types.length) return;

      let remaining = amount;

      if (types.length === 1 && types.includes("Commission")) {
        breakup.Commission += remaining;
        return;
      }

      if (types.includes("Insurance")) {
        const onlyInsurance = types.length === 1;
        const current = asInt(breakup.Insurance);
        const cap =
          onlyInsurance || insuranceTarget <= 0
            ? remaining
            : Math.max(0, insuranceTarget - current);
        const insuranceAlloc = Math.min(remaining, cap || remaining);
        breakup.Insurance += insuranceAlloc;
        remaining -= insuranceAlloc;
      }

      if (remaining > 0 && types.includes("Margin Money")) {
        const current = asInt(breakup["Margin Money"]);
        const cap = marginTarget > 0 ? Math.max(0, marginTarget - current) : remaining;
        const marginAlloc = Math.min(remaining, cap || remaining);
        breakup["Margin Money"] += marginAlloc;
        remaining -= marginAlloc;
      }

      if (remaining > 0 && types.includes("Exchange Vehicle")) {
        breakup["Exchange Vehicle"] += remaining;
        remaining = 0;
      }

      if (remaining > 0 && types.includes("Commission")) {
        breakup.Commission += remaining;
      }
    });

    return {
      receiptAmountTotal,
      receiptBreakup: breakup,
      insuranceAdjustmentTotal,
      exchangeReceivable: asInt(exchangeReceivable || 0),
    };
  }, [rows, insuranceReceivable, marginReceivable, exchangeReceivable]);

  useEffect(() => {
    if (typeof onTotalsChange === "function") onTotalsChange(totals);
  }, [totals, onTotalsChange]);

  const totalEntered = useMemo(() => asInt(totals.receiptAmountTotal), [totals]);

  const sectionCounts = useMemo(() => {
    const counts = {
      ALL: rows.length,
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
      OTHER: 0,
    };

    rows.forEach((row) => {
      const types = Array.isArray(row.receiptTypes) ? row.receiptTypes : [];
      if (!types.length) {
        counts.OTHER += 1;
        return;
      }
      let matched = false;
      types.forEach((type) => {
        if (Object.prototype.hasOwnProperty.call(counts, type)) {
          counts[type] += 1;
          matched = true;
        }
      });
      if (!matched) counts.OTHER += 1;
    });
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeSection === "ALL") return rows;
    if (activeSection === "OTHER") {
      return rows.filter((row) => {
        const types = Array.isArray(row.receiptTypes) ? row.receiptTypes : [];
        if (!types.length) return true;
        return !types.some((type) =>
          ["Insurance", "Margin Money", "Exchange Vehicle", "Commission"].includes(type),
        );
      });
    }
    return rows.filter((row) => {
      const types = Array.isArray(row.receiptTypes) ? row.receiptTypes : [];
      return types.includes(activeSection);
    });
  }, [rows, activeSection]);

  useEffect(() => {
    if (activeSection === "ALL") return;
    if ((rows || []).length === 0) return;
    if ((filteredRows || []).length > 0) return;
    setActiveSection("ALL");
  }, [activeSection, rows, filteredRows]);

  return (
    <Card
      className="autocredits-payments-entry-table"
      style={{
        "--apt-border": isDarkMode ? "#2a3342" : "#e2e8f0",
        "--apt-surface": isDarkMode ? "#0f172a" : "#f8fafc",
        "--apt-card": isDarkMode ? "#111c31" : "#ffffff",
        "--apt-text": isDarkMode ? "#e2e8f0" : "#0f172a",
        "--apt-muted": isDarkMode ? "#94a3b8" : "#64748b",
        "--apt-muted-strong": isDarkMode ? "#cbd5e1" : "#475569",
        "--apt-accent-border": isDarkMode ? "#a78bfa" : "#7c3aed",
        "--apt-accent-text": isDarkMode ? "#c4b5fd" : "#6d28d9",
        "--apt-accent-soft": isDarkMode ? "#241b44" : "#f3e8ff",
        "--apt-accent-soft-2": isDarkMode ? "#31245e" : "#e9d5ff",
        "--apt-chip-count-bg": isDarkMode ? "#1e293b" : "#f1f5f9",
        borderRadius: 18,
        border: "1px solid var(--apt-border)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--apt-surface) 86%, transparent), var(--apt-surface))",
        boxShadow: isDarkMode
          ? "0 16px 36px rgba(2,6,23,0.35)"
          : "0 16px 30px rgba(124,58,237,0.08)",
      }}
      bodyStyle={{ padding: 14 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
          background: "linear-gradient(135deg, var(--apt-accent-soft), transparent 70%)",
          border: "1px solid var(--apt-border)",
          borderRadius: 12,
          padding: "10px 12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.14,
              color: "var(--apt-muted)",
            }}
          >
            Autocredits account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            Receipts timeline
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--apt-muted)" }}>
            {readOnly ? (
              <>Verified ✅ Read-only mode enabled.</>
            ) : (
              <>
                Click a row to expand and edit. Use <b>Duplicate</b> for quick repetition.
              </>
            )}
          </div>
        </div>
        <Space />
      </div>

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
          label="Insurance"
          count={sectionCounts.Insurance}
          active={activeSection === "Insurance"}
          onClick={() => setActiveSection("Insurance")}
        />
        <SectionChip
          label="Margin money"
          count={sectionCounts["Margin Money"]}
          active={activeSection === "Margin Money"}
          onClick={() => setActiveSection("Margin Money")}
        />
        <SectionChip
          label="Exchange"
          count={sectionCounts["Exchange Vehicle"]}
          active={activeSection === "Exchange Vehicle"}
          onClick={() => setActiveSection("Exchange Vehicle")}
        />
        <SectionChip
          label="Commission"
          count={sectionCounts.Commission}
          active={activeSection === "Commission"}
          onClick={() => setActiveSection("Commission")}
        />
        <SectionChip
          label="Other"
          count={sectionCounts.OTHER}
          active={activeSection === "OTHER"}
          onClick={() => setActiveSection("OTHER")}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filteredRows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--apt-muted)" }}>
            No receipt rows in this section.
          </div>
        ) : (
          filteredRows.map((row, idx) => {
            const isEditing = editingRowId === row.id;
            const typesLabel = (row.receiptTypes || []).join(", ") || "Receipt entry";
            const modeLabel = row.receiptMode || "";
            const dateLabel = row.receiptDate
              ? dayjs(row.receiptDate).format("DD MMM YYYY")
              : "";
            const remarksShort = row.remarks || row.transactionDetails || "";
            const icon = getIconForRow(row);
            const typeTheme = getRowTheme(row, isDarkMode);
            const insurancePayerLabel =
              (row.receiptTypes || []).includes("Insurance") &&
              row.insurancePaymentMadeBy
                ? row.insurancePaymentMadeBy
                : "";

            return (
              <div key={row.id}>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--apt-border)",
                    borderLeft: `3px solid ${typeTheme.border}`,
                    background: "var(--apt-card)",
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    cursor: readOnly ? "default" : "pointer",
                  }}
                  onClick={() =>
                    !readOnly &&
                    setEditingRowId((prev) => (prev === row.id ? null : row.id))
                  }
                >
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
                        background: typeTheme.soft,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: typeTheme.text,
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--apt-text)" }}>
                        {typesLabel} #{idx + 1}
                        {row._auto && (
                          <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>
                            Auto
                          </Tag>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--apt-muted)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {modeLabel && <span>{modeLabel}</span>}
                        {dateLabel && <span>· {dateLabel}</span>}
                        {insurancePayerLabel && <span>· By {insurancePayerLabel}</span>}
                      </div>
                      {remarksShort && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted-strong)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 280,
                          }}
                        >
                          {remarksShort}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: typeTheme.amount,
                        minWidth: 100,
                        textAlign: "right",
                        background: isDarkMode
                          ? "rgba(15, 23, 42, 0.6)"
                          : "rgba(248, 250, 252, 0.9)",
                        border: "1px solid var(--apt-border)",
                        borderRadius: 999,
                        padding: "3px 10px",
                      }}
                    >
                      {row.receiptAmount ? money(row.receiptAmount) : "—"}
                    </div>
                    {!readOnly && (
                      <Space size="small">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateRow(row.id);
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

                {isEditing && !readOnly && (
                  <div
                    style={{
                      marginTop: 6,
                      marginBottom: 4,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid var(--apt-border)",
                      background: "var(--apt-surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Receipt type (multi select)
                        </div>
                        <Select
                          mode="multiple"
                          value={row.receiptTypes}
                          placeholder="Select"
                          style={{ width: "100%" }}
                          onChange={(val) =>
                            updateRow(row.id, {
                              receiptTypes: val,
                              insurancePaymentMadeBy: val.includes("Insurance")
                                ? row.insurancePaymentMadeBy || "Autocredits India LLP"
                                : "",
                            })
                          }
                          options={[
                            { value: "Insurance", label: "Insurance" },
                            { value: "Margin Money", label: "Margin Money" },
                            { value: "Exchange Vehicle", label: "Exchange Vehicle" },
                            { value: "Commission", label: "Commission" },
                          ]}
                        />
                      </div>

                      {(row.receiptTypes || []).includes("Insurance") && (
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--apt-muted)",
                              marginBottom: 4,
                            }}
                          >
                            Payment made by
                          </div>
                          <Select
                            value={row.insurancePaymentMadeBy || undefined}
                            placeholder="Select payer"
                            style={{ width: "100%" }}
                            onChange={(val) =>
                              updateRow(row.id, {
                                insurancePaymentMadeBy: val,
                                receiptMode:
                                  val === "Customer" ? "Adjustment" : row.receiptMode,
                              })
                            }
                            options={[
                              {
                                value: "Autocredits India LLP",
                                label: "Autocredits India LLP",
                              },
                              { value: "Customer", label: "Customer" },
                            ]}
                          />
                        </div>
                      )}

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Receipt mode
                        </div>
                        <Select
                          value={row.receiptMode || undefined}
                          placeholder="Select"
                          style={{ width: "100%" }}
                          onChange={(val) => updateRow(row.id, { receiptMode: val })}
                          options={[
                            { value: "Online Transfer/UPI", label: "Online Transfer/UPI" },
                            { value: "Cash", label: "Cash" },
                            { value: "Cheque", label: "Cheque" },
                            { value: "DD", label: "DD" },
                            { value: "Credit Card", label: "Credit Card" },
                            { value: "Adjustment", label: "Adjustment" },
                          ]}
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Receipt amount
                        </div>
                        <Input
                          value={formatAmountInput(row.receiptAmount)}
                          placeholder="Amount"
                          onChange={(e) =>
                            updateRow(row.id, {
                              receiptAmount: sanitizeAmountInput(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Receipt date
                        </div>
                        <DatePicker
                          value={row.receiptDate ? dayjs(row.receiptDate) : null}
                          style={{ width: "100%" }}
                          onChange={(dateValue) =>
                            updateRow(row.id, {
                              receiptDate: dateValue ? dateValue.toISOString() : null,
                            })
                          }
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Transaction details
                        </div>
                        <Input
                          value={row.transactionDetails}
                          placeholder="Txn / UTR / Ref"
                          onChange={(e) =>
                            updateRow(row.id, { transactionDetails: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--apt-muted)",
                            marginBottom: 4,
                          }}
                        >
                          Bank name
                        </div>
                        <AutoComplete
                          value={row.bankName}
                          style={{ width: "100%" }}
                          options={bankDirectoryOptions}
                          placeholder="Bank"
                          filterOption={(inputValue, option) =>
                            String(option?.value || "")
                              .toUpperCase()
                              .includes(String(inputValue || "").toUpperCase())
                          }
                          onChange={(value) => updateRow(row.id, { bankName: value })}
                        />
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--apt-muted)",
                          marginBottom: 4,
                        }}
                      >
                        Remarks
                      </div>
                      <Input
                        value={row.remarks}
                        placeholder="Remarks"
                        onChange={(e) => updateRow(row.id, { remarks: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!readOnly && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px dashed var(--apt-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--apt-muted-strong)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "var(--apt-muted)" }}>Total entered:</span>
            <b>{money(totalEntered)}</b>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
            Add receipt entry
          </Button>
        </div>
      )}
    </Card>
  );
};

export default AutocreditsPaymentsEntryTable;
