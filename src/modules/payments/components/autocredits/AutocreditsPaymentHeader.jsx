import React, { useMemo } from "react";
import { Card, Button } from "antd";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const AmountRow = ({ label, value, highlight }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "6px 0",
      fontWeight: highlight ? 900 : 650,
      color: highlight ? "#1d39c4" : "#111",
      borderTop: "1px dashed #eee",
    }}
  >
    <div style={{ fontSize: 12 }}>{label}</div>
    <div style={{ fontSize: 12 }}>{money(value)}</div>
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
  const summary = useMemo(() => {
    const showroomNet = asInt(data?.showroomNetOnRoadVehicleCost || 0);
    const customerNet = asInt(data?.customerNetOnRoadVehicleCost || 0);

    // margin strictly from DO nets (but prefer precomputed if present)
    const autocreditsMargin = Number.isFinite(Number(data?.autocreditsMargin))
      ? asInt(data.autocreditsMargin)
      : customerNet - showroomNet;

    const showroomAutoPaid = asInt(
      showroomTotals?.paymentAmountAutocredits || 0,
    );

    // exchange reduces receivable
    const exchangeReceivable = asInt(data?.autocreditsExchangeReceivable || 0);

    // insurance adds to receivable
    const insuranceReceivable = asInt(
      data?.autocreditsInsuranceReceivable || 0,
    );

    const exchangeAdjustment = asInt(data?.autocreditsExchangeDeduction || 0);

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
      exchangeReceivable: exchangeAdjustment, // rename for clarity
      netReceivable,
      receiptTotal,
      balancePayment,
      closingBalance: balancePayment,
      breakup: autocreditsTotals?.receiptBreakup || {},
    };
  }, [data, showroomTotals, autocreditsTotals]);

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
          alignItems: "center",
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
              marginBottom: 2,
            }}
          >
            Autocredits account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
            Receipts & closing
          </div>
        </div>

        <Button
          type={isVerified ? "default" : "primary"}
          onClick={onToggleVerified}
          disabled={!canVerify && !isVerified}
        >
          {isVerified ? "Verified ✅ (unlock)" : "Mark as verified"}
        </Button>
      </div>

      {/* Net receivable and components */}
      <div
        style={{
          marginTop: 6,
          padding: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <AmountRow
          label="Net receivable (Autocredits)"
          value={summary.netReceivable}
          highlight
        />

        <div style={{ marginTop: 4 }}>
          <AmountRow
            label="Autocredits margin"
            value={summary.autocreditsMargin}
          />
          <AmountRow
            label="Paid by Autocredits to showroom"
            value={summary.showroomAutoPaid}
          />
          <AmountRow
            label="Insurance receivable"
            value={summary.insuranceReceivable}
          />
          <AmountRow
            label="Less: exchange adjustment"
            value={summary.exchangeReceivable}
          />
        </div>
      </div>

      {/* Receipts from customer */}
      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <AmountRow
          label="Receipts from customer"
          value={summary.receiptTotal}
          highlight
        />

        <div style={{ marginTop: 6 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            Receipt breakup
          </div>
          <AmountRow
            label="Insurance"
            value={asInt(summary.breakup?.Insurance || 0)}
          />
          <AmountRow
            label="Margin money"
            value={asInt(summary.breakup?.["Margin Money"] || 0)}
          />
          <AmountRow
            label="Commission"
            value={asInt(summary.breakup?.Commission || 0)}
          />
        </div>
      </div>

      {/* Closing balance */}
      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <AmountRow
          label="Closing balance"
          value={summary.closingBalance}
          highlight
        />
      </div>

      {!isVerified && !canVerify && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
          You can verify only when <b>Closing balance = 0</b>.
        </div>
      )}

      {isVerified && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#1677ff" }}>
          🔒 Verified • Autocredits section is now read-only.
        </div>
      )}
    </Card>
  );
};

export default AutocreditsPaymentHeader;
