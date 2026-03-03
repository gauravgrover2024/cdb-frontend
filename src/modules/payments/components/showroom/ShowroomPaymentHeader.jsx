// src/modules/payments/components/showroom/ShowroomPaymentHeader.jsx
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
  // net impact of all cross adjustments for THIS case (signed)
  crossAdjustmentNet = 0,
  // full list of cross adjustment rows for display
  crossAdjustmentRows = [],
}) => {
  const summary = useMemo(() => {
    const netOnRoad = asInt(data?.netOnRoadVehicleCost);

    const loanPay = asInt(entryTotals?.paymentAmountLoan);
    const autoPay = asInt(entryTotals?.paymentAmountAutocredits);
    const custPay = asInt(entryTotals?.paymentAmountCustomer);

    const exAdjApplied = asInt(entryTotals?.paymentAdjustmentExchangeApplied);
    const insAdjApplied = asInt(entryTotals?.paymentAdjustmentInsuranceApplied);

    const commissionReceived = asInt(entryTotals?.paymentCommissionReceived);
    const crossAdjNet = asInt(crossAdjustmentNet);

    // vehicle + DO-side adjustments only
    const baseNetPayableToShowroom = Math.max(
      0,
      netOnRoad - insAdjApplied - exAdjApplied,
    );

    // ✅ final net payable after cross adjustments on commission
    const netPayableToShowroom = baseNetPayableToShowroom + crossAdjNet;

    const totalPaidToShowroom = loanPay + autoPay + custPay;

    const balancePayment = netPayableToShowroom - totalPaidToShowroom;

    // closing still includes commission received
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
      baseNetPayableToShowroom,
      netPayableToShowroom,

      autoPay,
      custPay,
      loanPay,

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
    };
  }, [data, entryTotals, crossAdjustmentNet]);

  const hasCrossAdjustments = (crossAdjustmentRows || []).length > 0;

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
            Showroom account
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
            Totals & verification
          </div>
        </div>
      </div>

      {/* Net on-road + adjustments (including cross adjustments now) */}
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
          label="Net on-road vehicle cost"
          value={summary.netOnRoad}
          highlight
        />
        <AmountRow
          label="Adjustment – Insurance"
          value={summary.insAdjApplied}
        />
        <AmountRow label="Adjustment – Exchange" value={summary.exAdjApplied} />

        {summary.crossAdjNet !== 0 && (
          <AmountRow
            label="Cross adjustments on commission"
            value={summary.crossAdjNet}
          />
        )}

        <div style={{ marginTop: 4 }}>
          <AmountRow
            label="Net payable to showroom"
            value={summary.netPayableToShowroom}
            highlight
          />
        </div>
      </div>

      {/* Payments in + commission */}
      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
        }}
      >
        <AmountRow label="Paid from Autocredits" value={summary.autoPay} />
        <AmountRow label="Paid from Customer" value={summary.custPay} />
        <AmountRow label="Paid from Loan" value={summary.loanPay} />

        <div style={{ marginTop: 4 }}>
          <AmountRow
            label="Balance payment"
            value={summary.balancePayment}
            highlight
          />
        </div>

        {summary.commissionReceived > 0 && (
          <div style={{ marginTop: 4 }}>
            <AmountRow
              label="Commission received"
              value={summary.commissionReceived}
            />
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          <AmountRow
            label="Closing balance"
            value={summary.closingBalance}
            highlight
          />
        </div>
      </div>

      {/* Cross adjustment details list */}
      {hasCrossAdjustments && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            Cross adjustment entries
          </div>

          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
            Positive = this case receives commission, negative = this case gives
            commission.
          </div>

          {(crossAdjustmentRows || []).map((row) => {
            const amt = asInt(row.paymentAmount);
            if (!amt) return null;

            const signedAmt =
              row.adjustmentDirection === "incoming" ? amt : -amt;

            const label = row.crossCaseLabel || "Other case (no label entered)";

            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "4px 0",
                  borderTop: "1px dashed #eee",
                }}
              >
                <div style={{ fontSize: 12, color: "#111827" }}>
                  {row.adjustmentDirection === "incoming" ? "From" : "To"}{" "}
                  {label}
                  {row.remarks && (
                    <span style={{ color: "#6b7280" }}> • {row.remarks}</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: signedAmt >= 0 ? "#15803d" : "#b91c1c",
                  }}
                >
                  {signedAmt >= 0 ? "+" : "-"} {money(Math.abs(signedAmt))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verify button */}
      <div style={{ marginTop: 12 }}>
        <Button
          type="primary"
          block
          disabled={isVerified || !summary.canVerify}
          onClick={() => onVerify && onVerify()}
        >
          {isVerified ? "Verified ✅ (read-only)" : "Mark showroom as verified"}
        </Button>
        {!isVerified && !summary.canVerify && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#6b7280",
              lineHeight: 1.4,
            }}
          >
            Verification is enabled only when <b>Closing balance = ₹ 0</b>.
          </div>
        )}
      </div>

      {/* Margin money tracking */}
      {summary.doMarginMoney > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: summary.marginMatched ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            Margin money
          </div>

          <AmountRow label="As per DO" value={summary.doMarginMoney} />
          <AmountRow
            label="Captured in payments"
            value={summary.paidMarginMoney}
          />
          <div style={{ marginTop: 4 }}>
            <AmountRow
              label={summary.marginMatched ? "Matched" : "Pending / mismatch"}
              value={summary.marginDiff}
              highlight
            />
          </div>
        </div>
      )}

      {/* Exchange vehicle block */}
      {summary.hasExchange && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            Exchange vehicle
          </div>

          <InfoRow label="Make" value={data?.do_exchangeMake} />
          <InfoRow label="Model" value={data?.do_exchangeModel} />
          <InfoRow label="Variant" value={data?.do_exchangeVariant} />
          <InfoRow label="Year" value={data?.do_exchangeYear} />
          <InfoRow label="Reg. number" value={data?.do_exchangeRegdNumber} />
        </div>
      )}
    </Card>
  );
};

export default ShowroomPaymentHeader;
