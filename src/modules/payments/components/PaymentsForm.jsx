import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, message } from "antd";
import { useParams } from "react-router-dom";

import PaymentGlobalHeader from "./PaymentGlobalHeader";

import ShowroomPaymentHeader from "./showroom/ShowroomPaymentHeader";
import ShowroomVehicleDetailsSection from "./showroom/ShowroomVehicleDetailsSection";
import ShowroomPaymentsEntryTable from "./showroom/ShowroomPaymentsEntryTable";

import AutocreditsPaymentSection from "./autocredits/AutocreditsPaymentSection";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

const getShowroomCommissionDate = (rows = []) => {
  if (!Array.isArray(rows)) return null;
  const commissionRows = rows.filter(
    (r) => r?.paymentType === "Commission" && r?.paymentDate
  );
  if (!commissionRows.length) return null;
  // take the latest dated row
  const sorted = [...commissionRows].sort((a, b) => {
    const da = new Date(a.paymentDate).getTime() || 0;
    const db = new Date(b.paymentDate).getTime() || 0;
    return db - da;
  });
  return sorted[0].paymentDate;
};

const PaymentForm = () => {
  const { loanId } = useParams();

  const [loan, setLoan] = useState(null);
  const [doRec, setDoRec] = useState(null);

  const [entryTotals, setEntryTotals] = useState({
    paymentAmountLoan: 0,
    paymentAmountAutocredits: 0,
    paymentAmountCustomer: 0,
    paymentAdjustmentExchangeApplied: 0,
    paymentAmountMarginMoney: 0,
    paymentAdjustmentInsuranceApplied: 0,
    paymentCommissionReceived: 0,
  });

  const [showroomRows, setShowroomRows] = useState([]);
  const [hasLoadedPayments, setHasLoadedPayments] = useState(false);

  const [isVerified, setIsVerified] = useState(false);

  const handleSavePayments = () => {
    try {
      const savedPayments = JSON.parse(
        localStorage.getItem("savedPayments") || "[]"
      );

      const existing =
        (savedPayments || []).find((p) => p?.loanId === loanId) ||
        (savedPayments || []).find((p) => p?.do_loanId === loanId) ||
        {};

      const showroomCommission = asInt(
        entryTotals?.paymentCommissionReceived || 0
      );

      const commissionDate = getShowroomCommissionDate(showroomRows);

      // existing autocredits rows if any
      const existingAutocreditsRows = Array.isArray(existing.autocreditsRows)
        ? existing.autocreditsRows
        : [];

      // check if a commission row already exists
      const hasCommissionRow = existingAutocreditsRows.some(
        (r) =>
          Array.isArray(r.receiptTypes) && r.receiptTypes.includes("Commission")
      );

      // if there is showroom commission and no commission row yet,
      // append one auto row
      const autocreditsRows =
        !hasCommissionRow && showroomCommission > 0
          ? [
              ...existingAutocreditsRows,
              {
                id: `auto-commission-${Date.now()}`,
                receiptTypes: ["Commission"],
                receiptMode: "Online Transfer/UPI", // or "Cash"
                receiptAmount: String(showroomCommission),
                receiptDate: commissionDate || null,
                transactionDetails: "",
                bankName: "",
                remarks: "Commission received from dealer",
              },
            ]
          : existingAutocreditsRows;

      const payload = {
        ...existing,
        loanId,
        do_loanId: doRec?.do_loanId || loanId,
        updatedAt: new Date().toISOString(),

        showroomRows,
        entryTotals,
        isVerified,

        // ✅ new field: keep / update autocreditsRows
        autocreditsRows,
      };
      const updated = Array.isArray(savedPayments)
        ? savedPayments.filter(
            (p) => p?.loanId !== loanId && p?.do_loanId !== loanId
          )
        : [];

      updated.push(payload);

      localStorage.setItem("savedPayments", JSON.stringify(updated));
      message.success("Payments saved successfully ✅");
    } catch (err) {
      console.error("Save Payments Error:", err);
      message.error("Failed to save payments ❌");
    }
  };

  // Load Loan + DO
  useEffect(() => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");
    const savedDOs = JSON.parse(localStorage.getItem("savedDOs") || "[]");

    const foundLoan = (savedLoans || []).find((l) => l?.loanId === loanId);
    setLoan(foundLoan || null);

    const foundDO =
      (savedDOs || []).find((d) => d?.loanId === loanId) ||
      (savedDOs || []).find((d) => d?.do_loanId === loanId);

    setDoRec(foundDO || null);
  }, [loanId]);

  // Load savedPayments (Showroom ONLY)
  useEffect(() => {
    const savedPayments = JSON.parse(
      localStorage.getItem("savedPayments") || "[]"
    );

    const found =
      (savedPayments || []).find((p) => p?.loanId === loanId) ||
      (savedPayments || []).find((p) => p?.do_loanId === loanId);

    if (found?.showroomRows?.length) setShowroomRows(found.showroomRows);

    if (found?.entryTotals) {
      setEntryTotals((prev) => ({ ...prev, ...found.entryTotals }));
    }

    if (found?.isVerified === true) setIsVerified(true);

    setHasLoadedPayments(true);
  }, [loanId]);

  // Autosave (Showroom ONLY)
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedPayments) return;

    try {
      const savedPayments = JSON.parse(
        localStorage.getItem("savedPayments") || "[]"
      );

      const existing =
        (savedPayments || []).find((p) => p?.loanId === loanId) ||
        (savedPayments || []).find((p) => p?.do_loanId === loanId) ||
        {};

      const showroomCommission = asInt(
        entryTotals?.paymentCommissionReceived || 0
      );

      const commissionDate = getShowroomCommissionDate(showroomRows);

      const existingAutocreditsRows = Array.isArray(existing.autocreditsRows)
        ? existing.autocreditsRows
        : [];

      const hasCommissionRow = existingAutocreditsRows.some(
        (r) =>
          Array.isArray(r.receiptTypes) && r.receiptTypes.includes("Commission")
      );

      const autocreditsRows =
        !hasCommissionRow && showroomCommission > 0
          ? [
              ...existingAutocreditsRows,
              {
                id: `auto-commission-${Date.now()}`,
                receiptTypes: ["Commission"],
                receiptMode: "Online Transfer/UPI",
                receiptAmount: String(showroomCommission),
                receiptDate: commissionDate || null,
                transactionDetails: "",
                bankName: "",
                remarks: "Commission received from dealer",
              },
            ]
          : existingAutocreditsRows;

      const payload = {
        ...existing,
        loanId,
        do_loanId: doRec?.do_loanId || loanId,
        updatedAt: new Date().toISOString(),

        showroomRows,
        entryTotals,
        isVerified,
        autocreditsRows,
      };

      const updated = Array.isArray(savedPayments)
        ? savedPayments.filter(
            (p) => p?.loanId !== loanId && p?.do_loanId !== loanId
          )
        : [];

      updated.push(payload);

      localStorage.setItem("savedPayments", JSON.stringify(updated));
    } catch (err) {
      console.error("Autosave Payments Error:", err);
    }
  }, [loanId, showroomRows, entryTotals, hasLoadedPayments, doRec, isVerified]);

  const showroomData = useMemo(() => {
    const financed = norm(loan?.isFinanced) === "yes";

    const customerName = loan?.customerName || doRec?.customerName || "—";

    const insuranceAmount = asInt(doRec?.do_insuranceCost || 0);

    const doRefNo =
      doRec?.do_refNo || doRec?.doRefNo || doRec?.refNo || doRec?.ref_no || "—";

    const loanRefNo =
      loan?.loanId || doRec?.do_loanId || doRec?.loanId || loanId || "—";

    const dealerName = doRec?.do_dealerName || doRec?.dealerName || "—";
    const dealerContactPerson = doRec?.do_dealerContactPerson || "";
    const dealerContactNumber = doRec?.do_dealerMobile || "";
    const dealerAddress = doRec?.do_dealerAddress || "";

    // ✅ IMPORTANT: Showroom Net OnRoad comes directly from DO field
    const netOnRoadVehicleCost = asInt(
      doRec?.do_customer_netOnRoadVehicleCost || 0
    );

    const onRoadVehicleCost = asInt(doRec?.do_onRoadVehicleCost || 0);
    const discountExclVehicleValue = asInt(
      doRec?.do_selectedDiscountExclVehicleValue || 0
    );

    const make = doRec?.do_vehicleMake || loan?.vehicleMake || "—";
    const model = doRec?.do_vehicleModel || loan?.vehicleModel || "—";
    const variant = doRec?.do_vehicleVariant || loan?.vehicleVariant || "—";

    const hypothecationBank =
      doRec?.do_hypothecation ||
      loan?.approval_bankName ||
      loan?.postfile_bankName ||
      "—";

    const exchangeValue = asInt(doRec?.do_exchangeVehiclePrice || 0);
    const purchaseDate = doRec?.do_exchangePurchaseDate || null;
    const exchangePurchasedBy = String(doRec?.do_exchangePurchasedBy || "");

    const loanPaymentPrefill = asInt(doRec?.do_financeDeduction || 0);
    const loanDisbursementDate =
      loan?.approval_disbursedDate || loan?.updatedAt || null;

    const doMarginMoney = asInt(doRec?.do_marginMoneyPaid || 0);

    // ✅ Customer Net OnRoad (Section 4 field)
    const customerNetOnRoadVehicleCost = asInt(
      doRec?.do_customer_netOnRoadVehicleCost || 0
    );
    // Showroom Net OnRoad (Section 3 field)
    const showroomNetOnRoadVehicleCost = asInt(
      doRec?.do_netOnRoadVehicleCost || 0
    );

    // Autocredits Margin = customer net - showroom net (from DO only)
    const autocreditsMargin =
      customerNetOnRoadVehicleCost - showroomNetOnRoadVehicleCost;

    // Exchange deduction only if purchased by autocredits
    const autocreditsExchangeDeduction =
      norm(exchangePurchasedBy) === "autocredits" ? exchangeValue : 0;

    const insuranceBy = String(doRec?.do_insuranceBy || "");

    const insuranceByNorm = norm(insuranceBy);

    // consider both "autocredits" and "autocredits india llp" as Autocredits
    const isAutocreditsInsurance = insuranceByNorm.includes("autocredits");

    const autocreditsInsuranceReceivable = isAutocreditsInsurance
      ? insuranceAmount
      : 0;

    return {
      customerName,
      doRefNo,
      loanRefNo,

      dealerName,
      dealerContactPerson,
      dealerContactNumber,
      dealerAddress,

      insuranceAmount,
      insuranceBy,

      make,
      model,
      variant,

      // keep old values also for showroom UI
      onRoadVehicleCost,
      discountExclVehicleValue,

      // ✅ Correct net value for showroom
      netOnRoadVehicleCost,

      ...entryTotals,

      isFinanced: financed,
      loanPaymentPrefill,
      loanDisbursementDate,
      hypothecationBank,

      exchangeValue,
      purchaseDate,
      exchangePurchasedBy,
      doMarginMoney,

      do_exchangeMake: doRec?.do_exchangeMake || "",
      do_exchangeModel: doRec?.do_exchangeModel || "",
      do_exchangeVariant: doRec?.do_exchangeVariant || "",
      do_exchangeYear: doRec?.do_exchangeYear || "",
      do_exchangeRegdNumber: doRec?.do_exchangeRegdNumber || "",

      // customer account net
      customerNetOnRoadVehicleCost,
      // showroom account net (for margin calc)
      showroomNetOnRoadVehicleCost,

      // autocredits rules
      autocreditsExchangeDeduction,
      autocreditsInsuranceReceivable,

      // margin (from DO nets only)
      autocreditsMargin,
    };
  }, [loan, doRec, loanId, entryTotals]);

  return (
    <div style={{ padding: 20 }}>
      <PaymentGlobalHeader data={showroomData} />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <Button type="primary" onClick={handleSavePayments}>
          Save Payments
        </Button>
      </div>

      <Card style={{ borderRadius: 14 }}>
        {/* SHOWROOM */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 12 }}>
            SECTION — Payment Details (Showroom Account)
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
              <ShowroomVehicleDetailsSection data={showroomData} />

              <ShowroomPaymentsEntryTable
                isFinanced={showroomData?.isFinanced}
                loanPaymentPrefill={showroomData?.loanPaymentPrefill || 0}
                loanDisbursementDate={showroomData?.loanDisbursementDate}
                hypothecationBank={showroomData?.hypothecationBank || ""}
                exchangeValue={showroomData?.exchangeValue || 0}
                purchaseDate={showroomData?.purchaseDate || null}
                exchangePurchasedBy={showroomData?.exchangePurchasedBy || ""}
                insuranceAmount={showroomData?.insuranceAmount || 0}
                insuranceBy={showroomData?.insuranceBy || ""}
                onTotalsChange={(t) => setEntryTotals(t)}
                onRowsChange={(r) => setShowroomRows(r)}
                initialRows={showroomRows}
                isVerified={isVerified}
              />
            </div>

            <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
              <ShowroomPaymentHeader
                data={showroomData}
                entryTotals={entryTotals}
                isVerified={isVerified}
                onVerify={() => {
                  setIsVerified(true);
                  message.success("Verified ✅ File is now Read-only");
                }}
              />
            </div>
          </div>
        </div>

        {/* AUTOCREDITS */}
        <div style={{ marginTop: 26 }}>
          <AutocreditsPaymentSection
            loanId={loanId}
            doLoanId={doRec?.do_loanId || loanId}
            showroomData={showroomData}
            showroomTotals={entryTotals}
            hasLoadedPayments={hasLoadedPayments}
          />
        </div>
      </Card>
    </div>
  );
};

export default PaymentForm;
