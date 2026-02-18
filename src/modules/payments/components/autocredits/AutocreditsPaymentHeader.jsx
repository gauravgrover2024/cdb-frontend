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
      showroomTotals?.paymentAmountAutocredits || 0
    );

    // exchange reduces receivable
    const exchangeReceivable = asInt(data?.autocreditsExchangeReceivable || 0);

    // insurance adds to receivable
    const insuranceReceivable = asInt(
      data?.autocreditsInsuranceReceivable || 0
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
    <Card style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14 }}>
          Autocredits Account — Totals
        </div>

        <Button
          type={isVerified ? "default" : "primary"}
          onClick={onToggleVerified}
          disabled={!canVerify && !isVerified}
        >
          {isVerified ? "Verified ✅ (Unlock)" : "Mark as Verified"}
        </Button>
      </div>

      <AmountRow
        label="Net Receivable (Autocredits)"
        value={summary.netReceivable}
        highlight
      />

      <div style={{ marginTop: 8 }}>
        <AmountRow
          label="Autocredits Margin"
          value={summary.autocreditsMargin}
        />
        <AmountRow
          label="Payments Made by Autocredits (Showroom)"
          value={summary.showroomAutoPaid}
        />
        <AmountRow
          label="Insurance Receivable (Autocredits)"
          value={summary.insuranceReceivable}
        />
        <AmountRow
          label="Less: Exchange Adjustment"
          value={summary.exchangeReceivable}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <AmountRow
          label="Receipt Amount (Customer)"
          value={summary.receiptTotal}
          highlight
        />
      </div>

      {/* internal breakup */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6 }}>
          Receipt Breakup (Internal)
        </div>
        <AmountRow
          label="Insurance"
          value={asInt(summary.breakup?.Insurance || 0)}
        />
        <AmountRow
          label="Margin Money"
          value={asInt(summary.breakup?.["Margin Money"] || 0)}
        />

        <AmountRow
          label="Commission"
          value={asInt(summary.breakup?.Commission || 0)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <AmountRow
          label="Closing Balance"
          value={summary.closingBalance}
          highlight
        />
      </div>

      {!isVerified && !canVerify && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
          ⚠️ You can verify only when <b>Closing Balance = 0</b>.
        </div>
      )}

      {isVerified && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#1677ff" }}>
          🔒 Verified • Autocredits section is now read-only.
        </div>
      )}
    </Card>
  );
};

export default AutocreditsPaymentHeader;
