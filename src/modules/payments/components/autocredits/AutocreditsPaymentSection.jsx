import React, { useEffect, useMemo, useState } from "react";
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
}) => {
  const [autocreditsRows, setAutocreditsRows] = useState([]);
  const [autocreditsTotals, setAutocreditsTotals] = useState({
    receiptAmountTotal: 0,
    receiptBreakup: {
      Insurance: 0,
      "Margin Money": 0,
      "Exchange Vehicle": 0,
      Commission: 0,
    },
  });

  const [isAutocreditsVerified, setIsAutocreditsVerified] = useState(false);

  // Load savedPayments (Autocredits only)
  useEffect(() => {
    if (!loanId) return;

    const savedPayments = JSON.parse(
      localStorage.getItem("savedPayments") || "[]"
    );

    const found =
      (savedPayments || []).find((p) => p?.loanId === loanId) ||
      (savedPayments || []).find((p) => p?.do_loanId === loanId);

    if (found?.autocreditsRows?.length)
      setAutocreditsRows(found.autocreditsRows);

    if (found?.autocreditsTotals) {
      setAutocreditsTotals((prev) => ({
        ...prev,
        ...found.autocreditsTotals,
      }));
    }

    if (typeof found?.isAutocreditsVerified === "boolean") {
      setIsAutocreditsVerified(found.isAutocreditsVerified);
    }
  }, [loanId]);

  // Autosave (Autocredits only)
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedPayments) return;

    try {
      const savedPayments = JSON.parse(
        localStorage.getItem("savedPayments") || "[]"
      );

      const updated = Array.isArray(savedPayments)
        ? savedPayments.filter(
            (p) => p?.loanId !== loanId && p?.do_loanId !== loanId
          )
        : [];

      const existing =
        (savedPayments || []).find((p) => p?.loanId === loanId) ||
        (savedPayments || []).find((p) => p?.do_loanId === loanId) ||
        {};

      const payload = {
        ...existing,
        loanId,
        do_loanId: doLoanId || existing?.do_loanId || loanId,
        updatedAt: new Date().toISOString(),
        autocreditsRows,
        autocreditsTotals,
        isAutocreditsVerified,
      };

      updated.push(payload);
      localStorage.setItem("savedPayments", JSON.stringify(updated));
    } catch (err) {
      console.error("Autosave Autocredits Error:", err);
    }
  }, [
    loanId,
    doLoanId,
    hasLoadedPayments,
    autocreditsRows,
    autocreditsTotals,
    isAutocreditsVerified,
  ]);

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
    // Net receivable for verification: margin + showroom payments + insurance - exchange
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
                    onTotalsChange={(t) => setAutocreditsTotals(t)}
                    onRowsChange={(r) => setAutocreditsRows(r)}
                    initialRows={autocreditsRows}
                    readOnly={isAutocreditsVerified}
                  />
                </div>

                <div
                  style={{ position: "sticky", top: 130, alignSelf: "start" }}
                >
                  <AutocreditsPaymentHeader
                    data={showroomData}
                    showroomTotals={showroomTotals}
                    autocreditsTotals={autocreditsTotals}
                    isVerified={isAutocreditsVerified}
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
