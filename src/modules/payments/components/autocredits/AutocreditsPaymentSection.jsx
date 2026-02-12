import React, { useMemo, useState, useEffect } from "react";
import { message } from "antd";

import AutocreditsPaymentHeader from "./AutocreditsPaymentHeader";
import AutocreditsPaymentsEntryTable from "./AutocreditsPaymentsEntryTable";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const AutocreditsPaymentSection = ({
  loanId,
  doLoanId,
  showroomData = {},
  showroomTotals = {},
  hasLoadedPayments = false,

  autocreditsRows = [],
  setAutocreditsRows = () => {},

  autocreditsTotals: autocreditsTotalsProp,
  setAutocreditsTotals = () => {},

  isAutocreditsVerified,
  setIsAutocreditsVerified = () => {},
}) => {
  const [localTotals, setLocalTotals] = useState({
    receiptAmountTotal: 0,
    receiptBreakup: {
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
    },
  });

  const autocreditsTotals = autocreditsTotalsProp || localTotals;

  useEffect(() => {
    if (autocreditsTotalsProp) return;
  }, [autocreditsTotalsProp]);

  const autocreditsMargin = asInt(showroomData?.autocreditsMargin || 0);
  const exchangeAdj = asInt(showroomData?.autocreditsExchangeDeduction || 0);
  const showroomAutoPaid = asInt(showroomTotals?.paymentAmountAutocredits || 0);
  const insuranceRecv = asInt(
    showroomData?.autocreditsInsuranceReceivable || 0,
  );

  const marginReceivable = autocreditsMargin + showroomAutoPaid - exchangeAdj;

  const canVerify = useMemo(() => {
    const netReceivable =
      autocreditsMargin + showroomAutoPaid + insuranceRecv - exchangeAdj;

    const receiptTotal = asInt(autocreditsTotals?.receiptAmountTotal || 0);

    return netReceivable - receiptTotal === 0;
  }, [
    autocreditsMargin,
    showroomAutoPaid,
    insuranceRecv,
    exchangeAdj,
    autocreditsTotals,
  ]);

  const handleTotalsChange = (t) => {
    if (typeof setAutocreditsTotals === "function") {
      setAutocreditsTotals(t);
    } else {
      setLocalTotals(t);
    }
  };

  return (
    <div style={{ marginTop: 48 }}>
      {/* Section Title */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#1d1d1f",
          letterSpacing: "-0.3px",
          marginBottom: 24,
        }}
      >
        Autocredits Account
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 350px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AutocreditsPaymentsEntryTable
            insuranceReceivable={insuranceRecv}
            exchangeReceivable={exchangeAdj}
            marginReceivable={marginReceivable}
            onTotalsChange={handleTotalsChange}
            onRowsChange={(r) => setAutocreditsRows(r)}
            initialRows={autocreditsRows}
            readOnly={!!isAutocreditsVerified}
          />
        </div>

        <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
          <AutocreditsPaymentHeader
            data={showroomData}
            showroomTotals={showroomTotals}
            autocreditsTotals={autocreditsTotals}
            isVerified={!!isAutocreditsVerified}
            canVerify={canVerify}
            onToggleVerified={() => {
              if (!isAutocreditsVerified && !canVerify) {
                message.warning("Closing Balance must be ₹0 to Verify.");
                return;
              }
              setIsAutocreditsVerified((v) => !v);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AutocreditsPaymentSection;
