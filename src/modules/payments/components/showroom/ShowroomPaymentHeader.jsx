// src/modules/payments/components/showroom/ShowroomPaymentHeader.jsx
import React, { useMemo } from "react";
import { Button, Card, Progress, Tag } from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
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

const LedgerRow = ({ label, value, tone = "default", isDarkMode = false }) => (
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
    <span
      style={{
        color: isDarkMode ? "#cbd5e1" : "#475569",
        minWidth: 0,
        flex: 1,
      }}
    >
      {label}
    </span>
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

const DetailCell = ({ label, value, isDarkMode = false }) => (
  <div
    style={{
      borderRadius: 10,
      border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
      background: isDarkMode ? "rgba(15,23,42,0.6)" : "#ffffff",
      padding: "8px 10px",
    }}
  >
    <div
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.28,
        fontWeight: 700,
        color: isDarkMode ? "#94a3b8" : "#64748b",
      }}
    >
      {label}
    </div>
    <div
      style={{
        marginTop: 4,
        fontSize: 12.5,
        fontWeight: 700,
        color: isDarkMode ? "#e2e8f0" : "#0f172a",
      }}
    >
      {value || "—"}
    </div>
  </div>
);

const ShowroomPaymentHeader = ({
  data = {},
  entryTotals = {},
  isVerified = false,
  onVerify,
  crossAdjustmentNet = 0,
  crossAdjustmentRows = [],
}) => {
  const { isDarkMode } = useTheme();

  const summary = useMemo(() => {
    const netOnRoad = asInt(data?.netOnRoadVehicleCost);

    const loanPay = asInt(entryTotals?.paymentAmountLoan);
    const autoPay = asInt(entryTotals?.paymentAmountAutocredits);
    const custPay = asInt(entryTotals?.paymentAmountCustomer);

    const exAdjApplied = asInt(entryTotals?.paymentAdjustmentExchangeApplied);
    const insAdjApplied = asInt(entryTotals?.paymentAdjustmentInsuranceApplied);

    const commissionReceived = asInt(entryTotals?.paymentCommissionReceived);
    const crossAdjNet = asInt(crossAdjustmentNet);

    const baseNetPayableToShowroom = Math.max(
      0,
      netOnRoad - insAdjApplied - exAdjApplied,
    );
    const netPayableToShowroom = baseNetPayableToShowroom + crossAdjNet;
    const totalPaidToShowroom = loanPay + autoPay + custPay;
    const balancePayment = netPayableToShowroom - totalPaidToShowroom;
    const closingBalance = balancePayment + commissionReceived;
    const canVerify = closingBalance === 0;

    const exchangeValue = asInt(data?.exchangeValue);
    const hasExchange = exchangeValue > 0;

    const doMarginMoney = asInt(data?.doMarginMoney);
    const paidMarginMoney = asInt(entryTotals?.paymentAmountMarginMoney);
    const marginDiff = doMarginMoney - paidMarginMoney;
    const marginMatched = doMarginMoney > 0 && marginDiff === 0;
    const marginProgress =
      doMarginMoney > 0
        ? Math.min(100, Math.max(0, (paidMarginMoney / doMarginMoney) * 100))
        : 0;

    return {
      netOnRoad,
      insAdjApplied,
      exAdjApplied,
      netPayableToShowroom,
      autoPay,
      custPay,
      loanPay,
      totalPaidToShowroom,
      balancePayment,
      commissionReceived,
      crossAdjNet,
      closingBalance,
      canVerify,
      exchangeValue,
      hasExchange,
      doMarginMoney,
      paidMarginMoney,
      marginDiff,
      marginMatched,
      marginProgress,
    };
  }, [data, entryTotals, crossAdjustmentNet]);

  const hasCrossAdjustments = (crossAdjustmentRows || []).length > 0;
  const closingTone =
    summary.closingBalance === 0
      ? "positive"
      : summary.closingBalance > 0
        ? "warning"
        : "danger";

  const settlementRatio =
    summary.netPayableToShowroom > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (summary.totalPaidToShowroom / summary.netPayableToShowroom) * 100,
          ),
        )
      : 100;

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
            ? "linear-gradient(135deg, rgba(82,100,255,0.08) 0%, rgba(34,197,94,0.04) 100%)"
            : "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(16,185,129,0.04) 100%)",
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
              Showroom account
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
              Totals & verification
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 700,
                borderColor: isVerified ? "#86efac" : "#93c5fd",
                color: isVerified ? "#166534" : "#1d4ed8",
                background: isVerified ? "#f0fdf4" : "#eff6ff",
              }}
            >
              {isVerified ? "Verified" : "In Progress"}
            </Tag>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 700,
                borderColor: summary.canVerify ? "#86efac" : "#fdba74",
                color: summary.canVerify ? "#166534" : "#9a3412",
                background: summary.canVerify ? "#f0fdf4" : "#fff7ed",
              }}
            >
              {summary.canVerify ? "Ready to Verify" : "Balance Pending"}
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
          minWidth: 0,
        }}
      >
        <SummaryPill
          label="Net payable"
          value={summary.netPayableToShowroom}
          tone="accent"
          isDarkMode={isDarkMode}
        />
        <SummaryPill
          label="Total paid"
          value={summary.totalPaidToShowroom}
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
        <div style={sectionTitleStyle(isDarkMode)}>Totals & verification</div>

        <LedgerRow label="Net on-road vehicle cost" value={summary.netOnRoad} tone="accent" isDarkMode={isDarkMode} />
        <LedgerRow label="Adjustment - Insurance" value={summary.insAdjApplied} isDarkMode={isDarkMode} />
        <LedgerRow label="Adjustment - Exchange" value={summary.exAdjApplied} isDarkMode={isDarkMode} />
        {summary.crossAdjNet !== 0 && (
          <LedgerRow
            label="Cross adjustment net"
            value={summary.crossAdjNet}
            tone={summary.crossAdjNet >= 0 ? "positive" : "danger"}
            isDarkMode={isDarkMode}
          />
        )}
        <LedgerRow label="Net payable to showroom" value={summary.netPayableToShowroom} tone="accent" isDarkMode={isDarkMode} />
        <LedgerRow label="Paid from Loan" value={summary.loanPay} isDarkMode={isDarkMode} />
        <LedgerRow label="Paid from Autocredits" value={summary.autoPay} isDarkMode={isDarkMode} />
        <LedgerRow label="Paid from Customer" value={summary.custPay} isDarkMode={isDarkMode} />
        <LedgerRow
          label="Balance payment"
          value={summary.balancePayment}
          tone={summary.balancePayment > 0 ? "warning" : "positive"}
          isDarkMode={isDarkMode}
        />
        {summary.commissionReceived > 0 && (
          <LedgerRow
            label="Commission received"
            value={summary.commissionReceived}
            tone="positive"
            isDarkMode={isDarkMode}
          />
        )}
        <LedgerRow
          label="Closing balance"
          value={summary.closingBalance}
          tone={closingTone}
          isDarkMode={isDarkMode}
        />
      </div>

      {hasCrossAdjustments && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`,
            background: isDarkMode ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.9)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              ...sectionTitleStyle(isDarkMode),
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <SwapOutlined />
            <span>Cross adjustment entries</span>
          </div>

          {(crossAdjustmentRows || []).map((row) => {
            const amt = asInt(row.paymentAmount);
            if (!amt) return null;
            const signedAmt = row.adjustmentDirection === "incoming" ? amt : -amt;
            const label = row.crossCaseLabel || "Other case";
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "7px 0",
                  borderTop: `1px dashed ${isDarkMode ? "#334155" : "#e5e7eb"}`,
                }}
              >
                <div style={{ fontSize: 12, color: isDarkMode ? "#e2e8f0" : "#0f172a", fontWeight: 600 }}>
                  {row.adjustmentDirection === "incoming" ? "From" : "To"} {label}
                  {row.remarks ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 1,
                        fontWeight: 500,
                        color: isDarkMode ? "#94a3b8" : "#64748b",
                      }}
                    >
                      {row.remarks}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: signedAmt >= 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {signedAmt >= 0 ? "+" : "-"} {money(Math.abs(signedAmt))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {summary.doMarginMoney > 0 && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`,
            background: isDarkMode
              ? "linear-gradient(140deg, rgba(15,23,42,0.55), rgba(30,41,59,0.45))"
              : "linear-gradient(140deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div style={sectionTitleStyle(isDarkMode)}>Margin money</div>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 700,
                borderColor: summary.marginMatched ? "#93c5fd" : "#fdba74",
                color: summary.marginMatched ? "#1d4ed8" : "#9a3412",
                background: summary.marginMatched ? "#eff6ff" : "#fff7ed",
              }}
            >
              {summary.marginMatched ? "Matched" : "Pending / Mismatch"}
            </Tag>
          </div>

          <Progress
            percent={summary.marginProgress}
            showInfo={false}
            strokeColor={summary.marginMatched ? "#2563eb" : "#f59e0b"}
            trailColor={isDarkMode ? "#334155" : "#e2e8f0"}
            size="small"
            style={{ marginBottom: 8 }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              minWidth: 0,
            }}
          >
            <SummaryPill label="As per DO" value={summary.doMarginMoney} isDarkMode={isDarkMode} />
            <SummaryPill label="Captured" value={summary.paidMarginMoney} isDarkMode={isDarkMode} />
            <SummaryPill
              label={summary.marginMatched ? "Matched" : "Pending"}
              value={summary.marginDiff}
              tone={summary.marginMatched ? "accent" : "warning"}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

      {summary.hasExchange && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`,
            background: isDarkMode ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.9)",
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              ...sectionTitleStyle(isDarkMode),
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CarOutlined />
            <span>Used car details</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <DetailCell label="Make" value={data?.do_exchangeMake} isDarkMode={isDarkMode} />
            <DetailCell label="Model" value={data?.do_exchangeModel} isDarkMode={isDarkMode} />
            <DetailCell label="Variant" value={data?.do_exchangeVariant} isDarkMode={isDarkMode} />
            <DetailCell label="Year" value={data?.do_exchangeYear} isDarkMode={isDarkMode} />
            <DetailCell
              label="Registration number"
              value={data?.do_exchangeRegdNumber}
              isDarkMode={isDarkMode}
            />
            <DetailCell label="Exchange value" value={money(summary.exchangeValue)} isDarkMode={isDarkMode} />
          </div>
        </div>
      )}

      <Button
        type="primary"
        block
        icon={summary.canVerify ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        disabled={isVerified || !summary.canVerify}
        onClick={() => onVerify && onVerify()}
        style={{
          height: 42,
          borderRadius: 12,
          fontWeight: 800,
          color: "#ffffff",
          textShadow: "0 1px 1px rgba(0,0,0,0.22)",
          background: isVerified
            ? undefined
            : "linear-gradient(90deg, #15803d 0%, #16a34a 100%)",
          borderColor: isVerified ? undefined : "#166534",
          boxShadow: isVerified ? "none" : "0 8px 18px rgba(22,163,74,0.28)",
        }}
      >
        {isVerified ? "Verified ✅ (read-only)" : "Mark showroom as verified"}
      </Button>

      {!isVerified && !summary.canVerify && (
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
    </Card>
  );
};

export default ShowroomPaymentHeader;
