import React, { useMemo, useState } from "react";
import { Button, Card, Modal, Progress, Tag } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { useTheme } from "../../../../context/ThemeContext";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const sectionTitleStyle = (isDarkMode) => ({
  marginBottom: 10,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: isDarkMode ? "#9ca3af" : "#6b7280",
});

const valueTone = (tone, isDarkMode) => {
  if (tone === "positive") return isDarkMode ? "#4ade80" : "#166534";
  if (tone === "danger") return isDarkMode ? "#fca5a5" : "#dc2626";
  if (tone === "warning") return isDarkMode ? "#fbbf24" : "#92400e";
  if (tone === "accent") return isDarkMode ? "#93c5fd" : "#1d4ed8";
  return isDarkMode ? "#e5e7eb" : "#111827";
};

const SummaryPill = ({ label, value, tone = "default", isDarkMode = false }) => (
  <div
    style={{
      borderRadius: 12,
      border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
      background: isDarkMode ? "rgba(30,41,59,0.55)" : "#ffffff",
      padding: "8px 10px",
    }}
  >
    <div
      style={{
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: 0.32,
        fontWeight: 700,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 900,
        lineHeight: 1.1,
        color: valueTone(tone, isDarkMode),
        overflowWrap: "anywhere",
      }}
    >
      {money(value)}
    </div>
  </div>
);

const LedgerRow = ({ label, value, tone = "default", isDarkMode = false, onClick }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      fontSize: 13,
      padding: "6px 0",
      borderTop: `1px dashed ${isDarkMode ? "#334155" : "#e5e7eb"}`,
    }}
  >
    <button
      type="button"
      onClick={onClick}
      style={{
        color: isDarkMode ? "#cbd5e1" : "#475569",
        minWidth: 0,
        flex: 1,
        textAlign: "left",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        textDecoration: onClick ? "underline" : "none",
      }}
    >
      {label}
    </button>
    <span
      style={{
        fontWeight: 800,
        color: valueTone(tone, isDarkMode),
        textAlign: "right",
        minWidth: 0,
        maxWidth: "42%",
        overflowWrap: "anywhere",
      }}
    >
      {money(value)}
    </span>
  </div>
);

const FormulaLine = ({ label, value, tone = "default", isDarkMode = false }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      padding: "8px 0",
      borderTop: `1px dashed ${isDarkMode ? "#334155" : "#e5e7eb"}`,
      fontSize: 13,
    }}
  >
    <span style={{ color: isDarkMode ? "#cbd5e1" : "#475569" }}>{label}</span>
    <span style={{ fontWeight: 800, color: valueTone(tone, isDarkMode) }}>
      {money(value)}
    </span>
  </div>
);

const AutocreditsPaymentHeader = ({
  data = {},
  showroomTotals = {},
  autocreditsTotals = {},
  isVerified = false,
  canVerify = false,
  onToggleVerified,
}) => {
  const { isDarkMode } = useTheme();
  const [showMarginModal, setShowMarginModal] = useState(false);

  const summary = useMemo(() => {
    const showroomNet = asInt(data?.showroomNetOnRoadVehicleCost || 0);
    const customerNet = asInt(data?.customerNetOnRoadVehicleCost || 0);
    const autocreditsMargin = Number.isFinite(Number(data?.autocreditsMargin))
      ? asInt(data.autocreditsMargin)
      : customerNet - showroomNet;

    const showroomAutoPaid = asInt(showroomTotals?.paymentAmountAutocredits || 0);
    const insuranceReceivable = asInt(
      data?.autocreditsInsurancePremiumReceivable ??
        data?.autocreditsInsuranceReceivable ??
        0,
    );
    const exchangeAdjustment = asInt(data?.autocreditsExchangeDeduction || 0);
    const insuranceAdjustment = asInt(
      autocreditsTotals?.insuranceAdjustmentTotal || 0,
    );

    const netReceivable =
      autocreditsMargin +
      showroomAutoPaid +
      insuranceReceivable -
      exchangeAdjustment -
      insuranceAdjustment;
    const receiptTotal = asInt(autocreditsTotals?.receiptAmountTotal || 0);
    const closingBalance = netReceivable - receiptTotal;

    return {
      autocreditsMargin,
      showroomAutoPaid,
      insuranceReceivable,
      exchangeAdjustment,
      insuranceAdjustment,
      netReceivable,
      receiptTotal,
      closingBalance,
      breakup: autocreditsTotals?.receiptBreakup || {},
    };
  }, [data, showroomTotals, autocreditsTotals]);

  const marginBreakup = useMemo(
    () => data?.autocreditsMarginBreakup || {},
    [data],
  );

  const settlementRatio =
    summary.netReceivable > 0
      ? Math.min(100, Math.max(0, (summary.receiptTotal / summary.netReceivable) * 100))
      : 100;
  const closingTone =
    summary.closingBalance === 0
      ? "positive"
      : summary.closingBalance > 0
        ? "warning"
        : "danger";

  return (
    <Card
      style={{
        width: "100%",
        minWidth: 0,
        borderRadius: 20,
        border: `1px solid ${isDarkMode ? "#2f3640" : "#dbe3ef"}`,
        background: isDarkMode
          ? "linear-gradient(180deg, rgba(30,34,40,0.98) 0%, rgba(20,22,27,0.98) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,253,0.98) 100%)",
        boxShadow: isDarkMode
          ? "0 20px 45px rgba(0,0,0,0.35)"
          : "0 20px 45px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
      bodyStyle={{ padding: 14 }}
    >
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${isDarkMode ? "#334155" : "#dbe4ef"}`,
          background: isDarkMode
            ? "linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(34,197,94,0.05) 100%)"
            : "linear-gradient(135deg, rgba(147,51,234,0.06) 0%, rgba(16,185,129,0.04) 100%)",
          padding: "10px 12px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isDarkMode ? "#9ca3af" : "#6b7280",
              }}
            >
              Autocredits account
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 20,
                lineHeight: 1.1,
                fontWeight: 800,
                color: isDarkMode ? "#f8fafc" : "#202938",
              }}
            >
              Receipts & closing
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 700,
                borderColor: isVerified ? "#86efac" : "#c4b5fd",
                color: isVerified ? "#166534" : "#6d28d9",
                background: isVerified ? "#f0fdf4" : "#f5f3ff",
              }}
            >
              {isVerified ? "Verified" : "In Progress"}
            </Tag>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 700,
                borderColor: canVerify ? "#86efac" : "#fdba74",
                color: canVerify ? "#166534" : "#9a3412",
                background: canVerify ? "#f0fdf4" : "#fff7ed",
              }}
            >
              {canVerify ? "Ready to Verify" : "Balance Pending"}
            </Tag>
          </div>
        </div>

        <Progress
          percent={settlementRatio}
          showInfo={false}
          strokeColor={
            summary.closingBalance === 0
              ? "#22c55e"
              : summary.closingBalance > 0
                ? "#f59e0b"
                : "#ef4444"
          }
          trailColor={isDarkMode ? "#334155" : "#e2e8f0"}
          size="small"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <SummaryPill
          label="Net receivable"
          value={summary.netReceivable}
          tone="accent"
          isDarkMode={isDarkMode}
        />
        <SummaryPill
          label="Receipts total"
          value={summary.receiptTotal}
          tone="positive"
          isDarkMode={isDarkMode}
        />
        <SummaryPill
          label="Closing balance"
          value={summary.closingBalance}
          tone={closingTone}
          isDarkMode={isDarkMode}
        />
      </div>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`,
          background: isDarkMode ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.9)",
          padding: "10px 12px",
          marginBottom: 12,
        }}
      >
        <div style={sectionTitleStyle(isDarkMode)}>Net receivable formula</div>
        <LedgerRow
          label="Autocredits margin"
          value={summary.autocreditsMargin}
          tone="accent"
          isDarkMode={isDarkMode}
          onClick={() => setShowMarginModal(true)}
        />
        <LedgerRow
          label="Paid by Autocredits to showroom"
          value={summary.showroomAutoPaid}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Insurance receivable"
          value={summary.insuranceReceivable}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Less: exchange adjustment"
          value={summary.exchangeAdjustment}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Less: insurance adjustment (customer-paid)"
          value={summary.insuranceAdjustment}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Net receivable (Autocredits)"
          value={summary.netReceivable}
          tone="accent"
          isDarkMode={isDarkMode}
        />
      </div>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`,
          background: isDarkMode ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.9)",
          padding: "10px 12px",
          marginBottom: 12,
        }}
      >
        <div style={sectionTitleStyle(isDarkMode)}>Receipts from customer</div>
        <LedgerRow
          label="Insurance"
          value={asInt(summary.breakup?.Insurance || 0)}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Margin money"
          value={asInt(summary.breakup?.["Margin Money"] || 0)}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Exchange vehicle"
          value={asInt(summary.breakup?.["Exchange Vehicle"] || 0)}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Commission"
          value={asInt(summary.breakup?.Commission || 0)}
          isDarkMode={isDarkMode}
        />
        <LedgerRow
          label="Receipts total"
          value={summary.receiptTotal}
          tone="positive"
          isDarkMode={isDarkMode}
        />
      </div>

      <Button
        type="primary"
        block
        icon={canVerify ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        disabled={!canVerify && !isVerified}
        onClick={onToggleVerified}
        style={{
          height: 42,
          borderRadius: 12,
          fontWeight: 800,
          color: "#ffffff",
          textShadow: "0 1px 1px rgba(0,0,0,0.22)",
          background: isVerified
            ? "linear-gradient(90deg, #64748b 0%, #475569 100%)"
            : "linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)",
          borderColor: isVerified ? "#475569" : "#5b21b6",
          boxShadow: isVerified ? "none" : "0 8px 18px rgba(109,40,217,0.28)",
        }}
      >
        {isVerified ? "Verified ✅ (unlock)" : "Mark autocredits as verified"}
      </Button>

      {!isVerified && !canVerify && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: isDarkMode ? "#94a3b8" : "#64748b",
            textAlign: "center",
          }}
        >
          Verification unlocks only when <b>Closing balance = ₹ 0</b>.
        </div>
      )}

      <Modal
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RiseOutlined />
            <span>Autocredits Margin Calculation</span>
          </span>
        }
        open={showMarginModal}
        onCancel={() => setShowMarginModal(false)}
        footer={null}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              background: isDarkMode ? "rgba(15,23,42,0.55)" : "#f8fafc",
              padding: "10px 12px",
            }}
          >
            <FormulaLine
              label="Showroom net on-road"
              value={marginBreakup?.showroomNetOnRoadVehicleCost || 0}
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Customer net on-road"
              value={marginBreakup?.customerNetOnRoadVehicleCost || 0}
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Less: customer insurance amount"
              value={marginBreakup?.customerInsuranceAmount || 0}
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Customer net on-road (without insurance)"
              value={marginBreakup?.customerNetWithoutInsurance || 0}
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Part A: (customer w/o insurance - showroom)"
              value={marginBreakup?.marginPartFromOnRoadDelta || 0}
              tone="accent"
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Insurance receivable (actual premium)"
              value={marginBreakup?.actualInsurancePremium || 0}
              isDarkMode={isDarkMode}
            />
            <FormulaLine
              label="Part B: (customer insurance - actual premium)"
              value={marginBreakup?.marginPartFromInsuranceSpread || 0}
              tone="accent"
              isDarkMode={isDarkMode}
            />
          </div>
          <div
            style={{
              marginTop: 2,
              borderRadius: 12,
              border: "1px solid #c7d2fe",
              background: "linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)",
              padding: "10px 12px",
              fontSize: 13,
              color: "#312e81",
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            Final Autocredits Margin: {money(marginBreakup?.autocreditsMargin || 0)}
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default AutocreditsPaymentHeader;
