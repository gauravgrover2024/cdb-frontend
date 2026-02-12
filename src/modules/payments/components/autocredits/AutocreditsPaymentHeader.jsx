import React, { useMemo } from "react";
import { Button } from "antd";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const AutocreditsPaymentHeader = ({
  data = {},
  showroomTotals = {},
  autocreditsTotals = {},
  isVerified = false,
  canVerify = false,
  onToggleVerified,
}) => {
  const summary = useMemo(() => {
    const showroomNet = asInt(data?.showroomNetOnRoadVehicleCost || 0);
    const customerNet = asInt(data?.customerNetOnRoadVehicleCost || 0);

    const autocreditsMargin = Number.isFinite(Number(data?.autocreditsMargin))
      ? asInt(data.autocreditsMargin)
      : customerNet - showroomNet;

    const showroomAutoPaid = asInt(
      showroomTotals?.paymentAmountAutocredits || 0,
    );

    const exchangeAdjustment = asInt(data?.autocreditsExchangeDeduction || 0);
    const insuranceReceivable = asInt(
      data?.autocreditsInsuranceReceivable || 0,
    );

    const netReceivable =
      autocreditsMargin +
      showroomAutoPaid +
      insuranceReceivable -
      exchangeAdjustment;

    const receiptTotal = asInt(autocreditsTotals?.receiptAmountTotal || 0);
    const balancePayment = netReceivable - receiptTotal;

    return {
      autocreditsMargin,
      showroomAutoPaid,
      insuranceReceivable,
      exchangeAdjustment,
      netReceivable,
      receiptTotal,
      balancePayment,
      closingBalance: balancePayment,
      breakup: autocreditsTotals?.receiptBreakup || {},
    };
  }, [data, showroomTotals, autocreditsTotals]);

  return (
    <div
      style={{
        background: "#f5f5f7",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: 20,
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1d1d1f",
          marginBottom: 20,
          letterSpacing: "-0.2px",
        }}
      >
        Autocredits Account Summary
      </div>

      {/* Net Receivable - Hero */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
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
          Net Receivable (Autocredits)
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.5px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {money(summary.netReceivable)}
        </div>

        {/* Breakdown */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <MiniRow label="Margin" value={summary.autocreditsMargin} />
          <MiniRow label="Showroom Payments" value={summary.showroomAutoPaid} />
          <MiniRow
            label="Insurance Receivable"
            value={summary.insuranceReceivable}
          />
          {summary.exchangeAdjustment > 0 && (
            <MiniRow
              label="Less: Exchange"
              value={summary.exchangeAdjustment}
              negative
            />
          )}
        </div>
      </div>

      {/* Receipts from Customer */}
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#86868b",
            marginBottom: 10,
          }}
        >
          Receipts from Customer
        </div>
        <SummaryRow
          label="Total Received"
          value={summary.receiptTotal}
          emphasized
        />
      </div>

      {/* Receipt Breakup */}
      {summary.receiptTotal > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#86868b",
              marginBottom: 8,
            }}
          >
            Receipt Breakup
          </div>
          <MiniRow label="Insurance" value={summary.breakup?.Insurance || 0} />
          <MiniRow
            label="Margin Money"
            value={summary.breakup?.["Margin Money"] || 0}
          />
          <MiniRow
            label="Commission"
            value={summary.breakup?.Commission || 0}
          />
        </div>
      )}

      {/* Closing Balance */}
      <div
        style={{
          background: summary.closingBalance === 0 ? "#d1f4e0" : "#fff3cd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SummaryRow
          label="Closing Balance"
          value={summary.closingBalance}
          hero
        />
      </div>

      {/* Verify Button */}
      <Button
        type={isVerified ? "default" : "primary"}
        block
        size="large"
        onClick={onToggleVerified}
        disabled={!canVerify && !isVerified}
        style={{
          height: 44,
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 15,
          background: isVerified
            ? "#86868b"
            : canVerify
              ? "#007aff"
              : "#d1d1d6",
          borderColor: "transparent",
          color: "#ffffff",
        }}
      >
        {isVerified
          ? "✓ Verified (Click to Unlock)"
          : canVerify
            ? "Verify Account"
            : "Balance Must Be ₹0"}
      </Button>

      {!isVerified && !canVerify && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "#86868b",
            textAlign: "center",
          }}
        >
          Closing balance must be ₹0 to verify
        </div>
      )}

      {isVerified && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "#007aff",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          🔒 Account locked · Read-only mode
        </div>
      )}
    </div>
  );
};

const SummaryRow = ({ label, value, emphasized, hero }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hero || emphasized ? 0 : 8,
    }}
  >
    <div
      style={{
        fontSize: hero ? 13 : emphasized ? 13 : 12,
        fontWeight: hero ? 700 : emphasized ? 600 : 500,
        color: "#1d1d1f",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: hero ? 20 : emphasized ? 15 : 13,
        fontWeight: hero ? 700 : emphasized ? 600 : 600,
        color: "#1d1d1f",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {money(value)}
    </div>
  </div>
);

const MiniRow = ({ label, value, negative }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      marginBottom: 4,
      color: "#424245",
    }}
  >
    <span>{label}</span>
    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {negative && "−"}
      {money(value)}
    </span>
  </div>
);

export default AutocreditsPaymentHeader;
