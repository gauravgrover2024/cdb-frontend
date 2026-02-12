import React, { useMemo } from "react";
import { Button } from "antd";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const ShowroomPaymentHeader = ({
  data = {},
  entryTotals = {},
  isVerified = false,
  onVerify,
}) => {
  const summary = useMemo(() => {
    const netOnRoad = asInt(data?.netOnRoadVehicleCost);
    const loanPay = asInt(entryTotals?.paymentAmountLoan);
    const autoPay = asInt(entryTotals?.paymentAmountAutocredits);
    const custPay = asInt(entryTotals?.paymentAmountCustomer);
    const exAdjApplied = asInt(entryTotals?.paymentAdjustmentExchangeApplied);
    const insAdjApplied = asInt(entryTotals?.paymentAdjustmentInsuranceApplied);
    const commissionReceived = asInt(entryTotals?.paymentCommissionReceived);

    const netPayableToShowroom = Math.max(
      0,
      netOnRoad - insAdjApplied - exAdjApplied,
    );
    const totalPaidToShowroom = loanPay + autoPay + custPay;
    const balancePayment = netPayableToShowroom - totalPaidToShowroom;
    const closingBalance = balancePayment + commissionReceived;
    const canVerify = closingBalance === 0;

    const doMarginMoney = asInt(data?.doMarginMoney);
    const paidMarginMoney = asInt(entryTotals?.paymentAmountMarginMoney);
    const marginDiff = doMarginMoney - paidMarginMoney;
    const marginMatched = doMarginMoney > 0 && marginDiff === 0;

    return {
      netOnRoad,
      insAdjApplied,
      exAdjApplied,
      netPayableToShowroom,
      autoPay,
      custPay,
      loanPay,
      balancePayment,
      commissionReceived,
      closingBalance,
      canVerify,
      doMarginMoney,
      paidMarginMoney,
      marginDiff,
      marginMatched,
    };
  }, [data, entryTotals]);

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
        Showroom Account Summary
      </div>

      {/* Net Payable - Hero */}
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
          Net Payable to Showroom
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
          ₹ {summary.netPayableToShowroom.toLocaleString("en-IN")}
        </div>

        {/* Breakdown */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <MiniRow label="Net On-Road" value={summary.netOnRoad} />
          {summary.insAdjApplied > 0 && (
            <MiniRow
              label="Insurance Adj."
              value={summary.insAdjApplied}
              negative
            />
          )}
          {summary.exAdjApplied > 0 && (
            <MiniRow
              label="Exchange Adj."
              value={summary.exAdjApplied}
              negative
            />
          )}
        </div>
      </div>

      {/* Payments Made */}
      <div style={{ marginBottom: 16 }}>
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
          Payments Received
        </div>
        <SummaryRow label="Loan" value={summary.loanPay} />
        <SummaryRow label="Autocredits" value={summary.autoPay} />
        <SummaryRow label="Customer" value={summary.custPay} />
      </div>

      {/* Balance */}
      <div
        style={{
          background: summary.closingBalance === 0 ? "#d1f4e0" : "#fff3cd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SummaryRow
          label="Balance Payment"
          value={summary.balancePayment}
          emphasized
        />
        {summary.commissionReceived > 0 && (
          <SummaryRow
            label="+ Commission"
            value={summary.commissionReceived}
            subtle
          />
        )}
        <div
          style={{
            height: 1,
            background: "rgba(0, 0, 0, 0.08)",
            margin: "10px 0",
          }}
        />
        <SummaryRow
          label="Closing Balance"
          value={summary.closingBalance}
          hero
        />
      </div>

      {/* Verify Button */}
      <Button
        type="primary"
        block
        size="large"
        disabled={isVerified || !summary.canVerify}
        onClick={onVerify}
        style={{
          height: 44,
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 15,
          background: isVerified
            ? "#86868b"
            : summary.canVerify
              ? "#007aff"
              : "#d1d1d6",
          borderColor: "transparent",
        }}
      >
        {isVerified
          ? "✓ Verified"
          : summary.canVerify
            ? "Verify Account"
            : "Balance Must Be ₹0"}
      </Button>

      {/* Margin Money Tracker */}
      {summary.doMarginMoney > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: summary.marginMatched
              ? "rgba(52, 199, 89, 0.1)"
              : "rgba(255, 59, 48, 0.1)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: summary.marginMatched ? "#34c759" : "#ff3b30",
              marginBottom: 8,
            }}
          >
            {summary.marginMatched
              ? "✓ Margin Money Matched"
              : "⚠ Margin Money Mismatch"}
          </div>
          <MiniRow label="As per DO" value={summary.doMarginMoney} />
          <MiniRow label="Paid" value={summary.paidMarginMoney} />
          {!summary.marginMatched && (
            <MiniRow
              label="Difference"
              value={Math.abs(summary.marginDiff)}
              negative={summary.marginDiff !== 0}
            />
          )}
        </div>
      )}
    </div>
  );
};

const SummaryRow = ({ label, value, emphasized, hero, subtle }) => (
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
        color: subtle ? "#86868b" : "#1d1d1f",
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
      ₹ {asInt(value).toLocaleString("en-IN")}
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
      {negative && "−"}₹ {asInt(value).toLocaleString("en-IN")}
    </span>
  </div>
);

export default ShowroomPaymentHeader;
