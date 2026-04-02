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
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  BankOutlined,
  UserOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useBankDirectoryOptions } from "../../../../hooks/useBankDirectoryOptions";
import { useTheme } from "../../../../context/ThemeContext";

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

const isMeaningfulShowroomRow = (r = {}) => {
  return Boolean(
    String(r?.paymentType || "").trim() ||
      String(r?.paymentAmount || "").trim() ||
      String(r?.paymentMode || "").trim() ||
      String(r?.paymentMadeBy || "").trim() ||
      String(r?.remarks || "").trim(),
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
      padding: "5px 11px",
      border: active
        ? "1px solid var(--spt-accent-border)"
        : "1px solid var(--spt-border)",
      background: active ? "var(--spt-accent-soft)" : "var(--spt-card)",
      fontSize: 11,
      color: active ? "var(--spt-accent-text)" : "var(--spt-muted-strong)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      boxShadow: active
        ? "0 0 0 1px color-mix(in srgb, var(--spt-accent-border) 24%, transparent)"
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
          ? "var(--spt-accent-soft-2)"
          : "var(--spt-chip-count-bg)",
      }}
    >
      {count}
    </span>
  </button>
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

const PAYMENT_TYPE_THEME = {
  default: {
    light: {
      border: "#94a3b8",
      soft: "#f1f5f9",
      text: "#334155",
      amount: "#0f172a",
    },
    dark: {
      border: "#64748b",
      soft: "#1e293b",
      text: "#cbd5e1",
      amount: "#e2e8f0",
    },
  },
  "Margin Money": {
    light: {
      border: "#2563eb",
      soft: "#dbeafe",
      text: "#1d4ed8",
      amount: "#1d4ed8",
    },
    dark: {
      border: "#60a5fa",
      soft: "#172554",
      text: "#93c5fd",
      amount: "#93c5fd",
    },
  },
  Loan: {
    light: {
      border: "#0f766e",
      soft: "#ccfbf1",
      text: "#0f766e",
      amount: "#0f766e",
    },
    dark: {
      border: "#2dd4bf",
      soft: "#0f2d2a",
      text: "#5eead4",
      amount: "#5eead4",
    },
  },
  "Exchange Vehicle": {
    light: {
      border: "#7c3aed",
      soft: "#ede9fe",
      text: "#6d28d9",
      amount: "#6d28d9",
    },
    dark: {
      border: "#a78bfa",
      soft: "#2b1f4b",
      text: "#c4b5fd",
      amount: "#c4b5fd",
    },
  },
  Insurance: {
    light: {
      border: "#0369a1",
      soft: "#e0f2fe",
      text: "#0369a1",
      amount: "#0369a1",
    },
    dark: {
      border: "#38bdf8",
      soft: "#122b3a",
      text: "#7dd3fc",
      amount: "#7dd3fc",
    },
  },
  Commission: {
    light: {
      border: "#b45309",
      soft: "#fef3c7",
      text: "#b45309",
      amount: "#b45309",
    },
    dark: {
      border: "#fbbf24",
      soft: "#3a2b14",
      text: "#fcd34d",
      amount: "#fcd34d",
    },
  },
  "Cross Adjustment": {
    light: {
      border: "#be185d",
      soft: "#fce7f3",
      text: "#be185d",
      amount: "#be185d",
    },
    dark: {
      border: "#f472b6",
      soft: "#3b1e33",
      text: "#f9a8d4",
      amount: "#f9a8d4",
    },
  },
};

const getPaymentTheme = (paymentType, isDarkMode) => {
  const typeTheme = PAYMENT_TYPE_THEME[paymentType] || PAYMENT_TYPE_THEME.default;
  return isDarkMode ? typeTheme.dark : typeTheme.light;
};

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
  const { isDarkMode } = useTheme();
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();
  const [rows, setRows] = useState([]);
  const [activeSection, setActiveSection] = useState("ALL");
  const [editingRowId, setEditingRowId] = useState(null);

  const exVal = asInt(exchangeValue);
  const insAmt = asInt(insuranceAmount);

  const didHydrateFromStorage = useRef(false);

  // ---------- HYDRATE FROM INITIAL ----------
  useEffect(() => {
    if (!Array.isArray(initialRows) || initialRows.length === 0) return;

    // First hydration pass.
    if (!didHydrateFromStorage.current) {
      setRows(initialRows);
      didHydrateFromStorage.current = true;
      return;
    }

    // Recovery hydration:
    // if current local rows are only auto/default but parent now has
    // meaningful backend rows, promote backend rows to UI.
    const incomingHasManualRows = initialRows.some(
      (r) => !r?._auto && isMeaningfulShowroomRow(r),
    );
    const currentHasManualRows = (rows || []).some(
      (r) => !r?._auto && isMeaningfulShowroomRow(r),
    );
    if (incomingHasManualRows && !currentHasManualRows) {
      setRows(initialRows);
    }
  }, [initialRows, rows]);

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

  // Keep loan rows aligned with resolved disbursement bank/date.
  // This avoids stale values from old saved snapshots.
  useEffect(() => {
    const targetBank = String(hypothecationBank || "").trim();
    const targetDate = loanDisbursementDate
      ? dayjs(loanDisbursementDate).toISOString()
      : null;
    if (!targetBank && !targetDate) return;

    setRows((prev) =>
      prev.map((r) => {
        if (r.paymentType !== "Loan") return r;
        const currentBank = String(r.bankName || "").trim();
        const currentDate = r.paymentDate ? dayjs(r.paymentDate).toISOString() : null;
        const nextBank = targetBank || currentBank;
        const nextDate = targetDate || currentDate;
        if (currentBank === nextBank && currentDate === nextDate) return r;
        return { ...r, bankName: nextBank, paymentDate: nextDate };
      }),
    );
  }, [hypothecationBank, loanDisbursementDate]);

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
    const needsAdjustment = insuranceAmt > 0 && by.includes("autocredits");

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
  const handleDuplicateRow = (rowId) => {
    if (isVerified) return;
    const cloneId = `${Date.now()}-${Math.random()}`;
    setRows((prev) => {
      const source = prev.find((r) => r.id === rowId);
      if (!source) return prev;
      const clone = {
        ...source,
        id: cloneId,
        _auto: false,
        _autoKey: null,
      };
      return [...prev, clone];
    });
    setEditingRowId(cloneId);
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

  useEffect(() => {
    if (activeSection === "ALL") return;
    if ((rows || []).length === 0) return;
    if ((filteredRows || []).length > 0) return;
    setActiveSection("ALL");
  }, [activeSection, rows, filteredRows]);

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
      className="showroom-payments-entry-table"
      style={{
        "--spt-border": isDarkMode ? "#2a3342" : "#e2e8f0",
        "--spt-surface": isDarkMode ? "#0f172a" : "#f8fafc",
        "--spt-card": isDarkMode ? "#111c31" : "#ffffff",
        "--spt-text": isDarkMode ? "#e2e8f0" : "#0f172a",
        "--spt-muted": isDarkMode ? "#94a3b8" : "#64748b",
        "--spt-muted-strong": isDarkMode ? "#cbd5e1" : "#475569",
        "--spt-accent-border": isDarkMode ? "#60a5fa" : "#2563eb",
        "--spt-accent-text": isDarkMode ? "#93c5fd" : "#1d4ed8",
        "--spt-accent-soft": isDarkMode ? "#172741" : "#eaf2ff",
        "--spt-accent-soft-2": isDarkMode ? "#1f3253" : "#dbeafe",
        "--spt-chip-count-bg": isDarkMode ? "#1e293b" : "#f1f5f9",
        "--spt-dashed-border": isDarkMode ? "#3b4f75" : "#c7d2fe",
        "--spt-dashed-bg": isDarkMode ? "#162238" : "#f3f4ff",
        borderRadius: 18,
        border: "1px solid var(--spt-border)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--spt-surface) 86%, transparent), var(--spt-surface))",
        boxShadow: isDarkMode
          ? "0 16px 36px rgba(2,6,23,0.35)"
          : "0 16px 30px rgba(2,132,199,0.08)",
      }}
      bodyStyle={{ padding: 14 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
          background: "linear-gradient(135deg, var(--spt-accent-soft), transparent 70%)",
          border: "1px solid var(--spt-border)",
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
              color: "var(--spt-muted)",
            }}
          >
            Showroom account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            Payments timeline
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--spt-muted)" }}>
            {isVerified ? (
              <>Verified ✅ Read-only mode enabled.</>
            ) : (
              <>
                Click a row to expand and edit. Use <b>Duplicate</b> to clone a
                similar row instantly.
              </>
            )}
          </div>
        </div>

        <Space />
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
          <div style={{ fontSize: 12, color: "var(--spt-muted)" }}>
            No payment rows in this section.
          </div>
        ) : (
          filteredRows.map((row) => {
            const typeTheme = getPaymentTheme(row.paymentType, isDarkMode);
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
                    border: "1px solid var(--spt-border)",
                    borderLeft: `3px solid ${typeTheme.border}`,
                    background: "var(--spt-card)",
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
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--spt-text)",
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
                          color: "var(--spt-muted)",
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
                        {row.paymentType === "Loan" && row.bankName && (
                          <span
                            style={{
                              maxWidth: 360,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                              verticalAlign: "bottom",
                            }}
                            title={row.bankName}
                          >
                            · {row.bankName}
                          </span>
                        )}
                      </div>
                      {(row.remarks ||
                        row.crossCaseLabel ||
                        row.transactionDetails) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--spt-muted-strong)",
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
                        color: typeTheme.amount,
                        minWidth: 100,
                        textAlign: "right",
                        background: isDarkMode
                          ? "rgba(15, 23, 42, 0.6)"
                          : "rgba(248, 250, 252, 0.9)",
                        border: "1px solid var(--spt-border)",
                        borderRadius: 999,
                        padding: "3px 10px",
                      }}
                    >
                      {row.paymentAmount ? money(row.paymentAmount) : "—"}
                    </div>
                    {!isVerified && (
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

                {/* Inline expanded editor */}
                {isEditing && !isVerified && (
                  <div
                    style={{
                      marginTop: 6,
                      marginBottom: 4,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid var(--spt-border)",
                      background: "var(--spt-surface)",
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
                            border: "1px dashed var(--spt-dashed-border)",
                            background: "var(--spt-dashed-bg)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--spt-muted-strong)",
                              marginBottom: 6,
                              fontWeight: 500,
                            }}
                          >
                            Cross adjustment details
                          </div>

                          <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: 10,
                          }}
                        >
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--spt-muted)",
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
                                  color: "var(--spt-muted)",
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
                                  color: "var(--spt-muted)",
                                  marginBottom: 4,
                                }}
                              >
                                Amount
                              </div>
                              <Input
                                value={formatAmountInput(row.paymentAmount)}
                                placeholder="Amount"
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    paymentAmount: sanitizeAmountInput(
                                      e.target.value,
                                    ),
                                  })
                                }
                              />
                            </div>
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
                                color: "var(--spt-muted)",
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
                                color: "var(--spt-muted)",
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
                                color: "var(--spt-muted)",
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
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--spt-muted)",
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
                                color: "var(--spt-muted)",
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
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--spt-muted)",
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
                                color: "var(--spt-muted)",
                                marginBottom: 4,
                              }}
                            >
                              Payment amount
                            </div>
                            <Input
                              value={formatAmountInput(row.paymentAmount)}
                              placeholder="Amount"
                              onChange={(e) =>
                                updateRow(row.id, {
                                  paymentAmount: sanitizeAmountInput(
                                    e.target.value,
                                  ),
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
                                color: "var(--spt-muted)",
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
                                color: "var(--spt-muted)",
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
                              color: "var(--spt-muted)",
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
                              color: "var(--spt-muted)",
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

      {!isVerified && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px dashed var(--spt-border)",
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
              color: "var(--spt-muted-strong)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "var(--spt-muted)" }}>Total entered:</span>
            <b>{money(totalEntered)}</b>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ShowroomPaymentsEntryNew;
