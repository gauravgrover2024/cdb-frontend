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

const InfoRow = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "6px 0",
      borderTop: "1px dashed #eee",
    }}
  >
    <div style={{ fontSize: 12, color: "#555", fontWeight: 650 }}>{label}</div>
    <div style={{ fontSize: 12, color: "#111", fontWeight: 700 }}>
      {value || "—"}
    </div>
  </div>
);

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

    // ✅ Net payable to showroom
    const netPayableToShowroom = Math.max(
      0,
      netOnRoad - insAdjApplied - exAdjApplied
    );

    // ✅ total paid to showroom (commission NOT included here)
    const totalPaidToShowroom = loanPay + autoPay + custPay;

    // ✅ Balance Payment (same as before)
    const balancePayment = netPayableToShowroom - totalPaidToShowroom;

    // ✅ Closing Balance includes commission received
    const closingBalance = balancePayment + commissionReceived;

    const canVerify = closingBalance === 0;

    const exchangeValue = asInt(data?.exchangeValue);
    const hasExchange = exchangeValue > 0;

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

      exchangeValue,
      hasExchange,

      doMarginMoney,
      paidMarginMoney,
      marginDiff,
      marginMatched,
    };
  }, [data, entryTotals]);

  return (
    <Card
      style={{
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        background: "#ffffff",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
        Showroom Account — Totals
      </div>

      {/* 1) Net OnRoad */}
      <AmountRow
        label="Net OnRoad Vehicle Cost"
        value={summary.netOnRoad}
        highlight
      />

      {/* 2) Adjustments */}
      <AmountRow
        label="Payment Adjustment (Insurance)"
        value={summary.insAdjApplied}
      />
      <AmountRow
        label="Payment Adjustment (Exchange)"
        value={summary.exAdjApplied}
      />

      {/* 3) Net payable to showroom */}
      <div style={{ marginTop: 6 }}>
        <AmountRow
          label="Net Payable to Showroom"
          value={summary.netPayableToShowroom}
          highlight
        />
      </div>

      {/* 4) Payments */}
      <AmountRow label="Payment Amount (Autocredits)" value={summary.autoPay} />
      <AmountRow label="Payment Amount (Customer)" value={summary.custPay} />
      <AmountRow label="Payment Amount (Loan)" value={summary.loanPay} />

      {/* 5) Balance payment */}
      <div style={{ marginTop: 6 }}>
        <AmountRow
          label="Balance Payment"
          value={summary.balancePayment}
          highlight
        />
      </div>

      {/* 6) Commission (only if entered) */}
      {summary.commissionReceived > 0 && (
        <div style={{ marginTop: 6 }}>
          <AmountRow
            label="Commission Received"
            value={summary.commissionReceived}
          />
        </div>
      )}

      {/* 7) Closing Balance */}
      <div style={{ marginTop: 6 }}>
        <AmountRow
          label="Closing Balance"
          value={summary.closingBalance}
          highlight
        />
      </div>

      {/* ✅ VERIFY BUTTON */}
      <div style={{ marginTop: 14 }}>
        <Button
          type="primary"
          block
          disabled={isVerified || !summary.canVerify}
          onClick={() => onVerify && onVerify()}
        >
          {isVerified ? "Verified ✅ (Read-only)" : "Mark as Verified"}
        </Button>

        {!isVerified && !summary.canVerify && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
            Verification allowed only when <b>Closing Balance = ₹ 0</b>.
          </div>
        )}
      </div>

      {/* Margin Money Tracking */}
      {summary.doMarginMoney > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            background: summary.marginMatched ? "#f6ffed" : "#fff1f0",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            Margin Money Tracking
          </div>

          <AmountRow label="As per DO" value={summary.doMarginMoney} />
          <AmountRow
            label="Paid in Payments Module"
            value={summary.paidMarginMoney}
          />

          <div style={{ marginTop: 6 }}>
            <AmountRow
              label={
                summary.marginMatched ? "Matched ✅" : "Pending / Mismatch ❌"
              }
              value={summary.marginDiff}
              highlight
            />
          </div>
        </div>
      )}

      {/* Exchange info section */}
      {summary.hasExchange && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
            Exchange Vehicle Details
          </div>

          <InfoRow label="Make" value={data?.do_exchangeMake} />
          <InfoRow label="Model" value={data?.do_exchangeModel} />
          <InfoRow label="Variant" value={data?.do_exchangeVariant} />
          <InfoRow label="Year" value={data?.do_exchangeYear} />
          <InfoRow label="Regd No" value={data?.do_exchangeRegdNumber} />
        </div>
      )}
    </Card>
  );
};

export default ShowroomPaymentHeader;
