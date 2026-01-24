import React, { useMemo, useState, useEffect } from "react";
import { Collapse, message } from "antd";

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

  // ✅ controlled props from PaymentForm (Mongo document)
  autocreditsRows = [],
  setAutocreditsRows = () => {},

  autocreditsTotals: autocreditsTotalsProp,
  setAutocreditsTotals = () => {},

  isAutocreditsVerified,
  setIsAutocreditsVerified = () => {},
}) => {
  // fallback defaults (only used if parent doesn't pass totals yet)
  const [localTotals, setLocalTotals] = useState({
    receiptAmountTotal: 0,
    receiptBreakup: {
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
    },
  });

  // if parent totals exist, use them, else use localTotals
  const autocreditsTotals = autocreditsTotalsProp || localTotals;

  // keep local totals synced if parent doesn't control it
  useEffect(() => {
    if (autocreditsTotalsProp) return;
    // parent is not controlling totals, keep local state active
  }, [autocreditsTotalsProp]);

  // Net margin from DO (already computed in PaymentForm and passed via showroomData)
  const autocreditsMargin = asInt(showroomData?.autocreditsMargin || 0);
  const exchangeAdj = asInt(showroomData?.autocreditsExchangeDeduction || 0);
  const showroomAutoPaid = asInt(showroomTotals?.paymentAmountAutocredits || 0);
  const insuranceRecv = asInt(
    showroomData?.autocreditsInsuranceReceivable || 0
  );

  // Net margin receivable component = margin + showroomAutoPaid - exchangeAdj
  // (insurance receivable is handled separately)
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
    <div style={{ marginTop: 26 }}>
      <Collapse
        defaultActiveKey={["autocredits"]}
        items={[
          {
            key: "autocredits",
            label: (
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                SECTION — Payment Details (Autocredits Account)
              </div>
            ),
            children: (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 350px",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
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

                <div
                  style={{ position: "sticky", top: 130, alignSelf: "start" }}
                >
                  <AutocreditsPaymentHeader
                    data={showroomData}
                    showroomTotals={showroomTotals}
                    autocreditsTotals={autocreditsTotals}
                    isVerified={!!isAutocreditsVerified}
                    canVerify={canVerify}
                    onToggleVerified={() => {
                      if (!isAutocreditsVerified && !canVerify) {
                        message.warning("Closing Balance must be 0 to Verify.");
                        return;
                      }
                      setIsAutocreditsVerified((v) => !v);
                    }}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AutocreditsPaymentSection;
