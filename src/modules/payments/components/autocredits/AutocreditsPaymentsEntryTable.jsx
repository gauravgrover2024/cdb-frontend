import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoComplete,
  Card,
  Button,
  Input,
  DatePicker,
  Select,
  Space,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  BankOutlined,
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
  receiptTypes: [],
  receiptMode: "",
  receiptAmount: "",
  receiptDate: null,
  transactionDetails: "",
  bankName: "",
  remarks: "",
});

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

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
    {children}
  </div>
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

const getIconForRow = (row) => {
  const types = Array.isArray(row.receiptTypes) ? row.receiptTypes : [];
  if (types.includes("Insurance")) return <BankOutlined />;
  if (types.includes("Exchange Vehicle")) return <SwapOutlined />;
  return <UserOutlined />;
};

const AutocreditsPaymentsEntryTable = ({
  insuranceReceivable = 0,
  exchangeReceivable = 0, // reserved
  marginReceivable = 0,
  onTotalsChange,
  onRowsChange,
  initialRows = [],
  readOnly = false,
}) => {
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();
  const [rows, setRows] = useState([]);
  const [activeSection, setActiveSection] = useState("ALL");
  const [editingRowId, setEditingRowId] = useState(null);
  const didHydrate = useRef(false);

  // hydrate
  useEffect(() => {
    if (didHydrate.current) return;
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows);
      didHydrate.current = true;
      return;
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
    const r = emptyRow();
    setRows((p) => [...p, r]);
    setEditingRowId(r.id);
  };

  const handleDeleteRow = (rowId) => {
    if (readOnly) return;
    setRows((p) => (p.length <= 1 ? p : p.filter((r) => r.id !== rowId)));
    setEditingRowId((prev) => (prev === rowId ? null : prev));
  };

  const updateRow = (rowId, patch) => {
    if (readOnly) return;
    setRows((p) => p.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  // allocation logic
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

      if (selected.length === 1 && selected.includes("Commission")) {
        breakup.Commission += remaining;
        return;
      }

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

  const totalEntered = useMemo(
    () => asInt(totals.receiptAmountTotal),
    [totals],
  );

  // section counts
  const sectionCounts = useMemo(() => {
    const counts = {
      ALL: rows.length,
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
      OTHER: 0,
    };

    rows.forEach((r) => {
      const types = Array.isArray(r.receiptTypes) ? r.receiptTypes : [];
      if (!types.length) {
        counts.OTHER += 1;
        return;
      }

      let tagged = false;
      types.forEach((t) => {
        if (counts[t] !== undefined) {
          counts[t] += 1;
          tagged = true;
        }
      });
      if (!tagged) counts.OTHER += 1;
    });

    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (activeSection === "ALL") return rows;
    if (activeSection === "OTHER") {
      return rows.filter((r) => {
        const t = Array.isArray(r.receiptTypes) ? r.receiptTypes : [];
        if (!t.length) return true;
        return !t.some((x) =>
          [
            "Insurance",
            "Margin Money",
            "Exchange Vehicle",
            "Commission",
          ].includes(x),
        );
      });
    }
    return rows.filter((r) => {
      const t = Array.isArray(r.receiptTypes) ? r.receiptTypes : [];
      return t.includes(activeSection);
    });
  }, [rows, activeSection]);

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
            Autocredits account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            Receipts timeline
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
            {readOnly ? (
              <>Verified ✅ Read-only mode enabled.</>
            ) : (
              <>
                Click a row to expand, or <b>Add receipt entry</b> to create a
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
            disabled={readOnly}
          >
            Add receipt entry
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

      {/* Timeline list with icons + inline editor */}
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
            No receipt rows in this section.
          </div>
        ) : (
          filteredRows.map((row, idx) => {
            const isEditing = editingRowId === row.id;

            const typesLabel =
              (row.receiptTypes || []).join(", ") || "Receipt entry";
            const modeLabel = row.receiptMode || "";
            const dateLabel = row.receiptDate
              ? dayjs(row.receiptDate).format("DD MMM YYYY")
              : "";
            const remarksShort = row.remarks || row.transactionDetails || "";

            const icon = getIconForRow(row);

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
                    cursor: readOnly ? "default" : "pointer",
                    opacity: readOnly ? 0.95 : 1,
                  }}
                  onClick={() =>
                    !readOnly &&
                    setEditingRowId((prev) => (prev === row.id ? null : row.id))
                  }
                >
                  {/* Left: icon + text */}
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
                        {typesLabel} #{idx + 1}
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
                        {modeLabel && <span>{modeLabel}</span>}
                        {dateLabel && <span>· {dateLabel}</span>}
                      </div>
                      {remarksShort && (
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
                          {remarksShort}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + delete */}
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
                      {row.receiptAmount ? money(row.receiptAmount) : "—"}
                    </div>
                    {!readOnly && (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(row.id);
                        }}
                      />
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
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <FieldBox>
                        <FieldLabel>Receipt type (multi select)</FieldLabel>
                        <Select
                          mode="multiple"
                          value={row.receiptTypes}
                          placeholder="Select"
                          style={{ width: "100%" }}
                          onChange={(val) =>
                            updateRow(row.id, { receiptTypes: val })
                          }
                          disabled={readOnly}
                          options={[
                            { value: "Insurance", label: "Insurance" },
                            { value: "Margin Money", label: "Margin Money" },
                            {
                              value: "Exchange Vehicle",
                              label: "Exchange Vehicle",
                            },
                            { value: "Commission", label: "Commission" },
                          ]}
                        />
                      </FieldBox>

                      <FieldBox>
                        <FieldLabel>Receipt mode</FieldLabel>
                        <Select
                          value={row.receiptMode || undefined}
                          placeholder="Select"
                          style={{ width: "100%" }}
                          onChange={(val) =>
                            updateRow(row.id, { receiptMode: val })
                          }
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
                        <FieldLabel>Receipt amount</FieldLabel>
                        <Input
                          value={formatAmountInput(row.receiptAmount)}
                          placeholder="Amount"
                          onChange={(e) =>
                            updateRow(row.id, {
                              receiptAmount: sanitizeAmountInput(
                                e.target.value,
                              ),
                            })
                          }
                          disabled={readOnly}
                        />
                      </FieldBox>

                      <FieldBox>
                        <FieldLabel>Receipt date</FieldLabel>
                        <DatePicker
                          value={
                            row.receiptDate ? dayjs(row.receiptDate) : null
                          }
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
                        <FieldLabel>Transaction details</FieldLabel>
                        <Input
                          value={row.transactionDetails}
                          placeholder="Txn / UTR / Ref"
                          onChange={(e) =>
                            updateRow(row.id, {
                              transactionDetails: e.target.value,
                            })
                          }
                          disabled={readOnly}
                        />
                      </FieldBox>

                      <FieldBox>
                        <FieldLabel>Bank name</FieldLabel>
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
                            updateRow(row.id, { bankName: value })
                          }
                          disabled={readOnly}
                        />
                      </FieldBox>
                    </div>

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
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default AutocreditsPaymentsEntryTable;
