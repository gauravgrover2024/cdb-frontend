import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, message } from "antd";
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
  const sorted = [...commissionRows].sort((a, b) => {
    const da = new Date(a.paymentDate).getTime() || 0;
    const db = new Date(b.paymentDate).getTime() || 0;
    return db - da;
  });
  return sorted[0].paymentDate;
};

// ---- API helpers (Mongo via Vercel API) ----
const fetchPaymentByLoanId = async (loanId) => {
  const res = await fetch(`/api/payments/${loanId}`);
  if (!res.ok) throw new Error("Failed to fetch payment");
  return res.json(); // can be null
};

const savePaymentByLoanId = async (loanId, payload) => {
  const res = await fetch(`/api/payments/${loanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save payment");
};

const useDebounce = (value, delay = 800) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

const PaymentForm = () => {
  const { loanId } = useParams();

  const [loan, setLoan] = useState(null);
  const [doRec, setDoRec] = useState(null);

  // Showroom section states
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
  const [isVerified, setIsVerified] = useState(false);

  // Autocredits section states (NOW FROM SAME MONGO DOC)
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

  const [hasLoadedPayments, setHasLoadedPayments] = useState(false);

  // Keep latest saved doc in memory (so we don't GET before every autosave)
  const [existingPayment, setExistingPayment] = useState(null);

  // Debounced values (prevents saving on every keystroke)
  const debouncedShowroomRows = useDebounce(showroomRows, 800);
  const debouncedEntryTotals = useDebounce(entryTotals, 800);
  const debouncedIsVerified = useDebounce(isVerified, 800);

  const debouncedAutocreditsRows = useDebounce(autocreditsRows, 800);
  const debouncedAutocreditsTotals = useDebounce(autocreditsTotals, 800);
  const debouncedIsAutocreditsVerified = useDebounce(
    isAutocreditsVerified,
    800
  );

  // Avoid toast spam
  const lastSaveAtRef = useRef(0);

  // Load Loan + DO (still from localStorage for now)
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

  // Load savedPayments (FULL DOC) from API
  useEffect(() => {
    if (!loanId) return;

    const load = async () => {
      try {
        const found = await fetchPaymentByLoanId(loanId);

        setExistingPayment(found || null);

        // Showroom
        if (Array.isArray(found?.showroomRows))
          setShowroomRows(found.showroomRows);

        if (found?.entryTotals) {
          setEntryTotals((prev) => ({ ...prev, ...found.entryTotals }));
        }

        if (found?.isVerified === true) setIsVerified(true);

        // Autocredits
        if (Array.isArray(found?.autocreditsRows)) {
          setAutocreditsRows(found.autocreditsRows);
        }

        if (found?.autocreditsTotals) {
          setAutocreditsTotals((prev) => ({
            ...prev,
            ...found.autocreditsTotals,
          }));
        }

        if (typeof found?.isAutocreditsVerified === "boolean") {
          setIsAutocreditsVerified(found.isAutocreditsVerified);
        }
      } catch (err) {
        console.error("Load Payments Error:", err);
      } finally {
        setHasLoadedPayments(true);
      }
    };

    load();
  }, [loanId]);

  // Autosave (FULL DOC) via API (Debounced + Single Document)
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedPayments) return;

    const autosave = async () => {
      try {
        const existing = existingPayment || null;

        // ---- Commission replicate logic: showroom -> autocredits ----
        const showroomCommission = asInt(
          debouncedEntryTotals?.paymentCommissionReceived || 0
        );

        const commissionDate = getShowroomCommissionDate(debouncedShowroomRows);

        const baseAutocreditsRows = Array.isArray(debouncedAutocreditsRows)
          ? debouncedAutocreditsRows
          : [];

        const hasCommissionRow = baseAutocreditsRows.some(
          (r) =>
            Array.isArray(r.receiptTypes) &&
            r.receiptTypes.includes("Commission")
        );

        const autocreditsRowsToSave =
          !hasCommissionRow && showroomCommission > 0
            ? [
                ...baseAutocreditsRows,
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
            : baseAutocreditsRows;

        // ---- Build full Mongo document payload ----
        const payload = {
          ...(existing || {}),
          loanId,
          do_loanId: doRec?.do_loanId || loanId,
          updatedAt: new Date().toISOString(),

          // Showroom
          showroomRows: debouncedShowroomRows,
          entryTotals: debouncedEntryTotals,
          isVerified: debouncedIsVerified,

          // Autocredits
          autocreditsRows: autocreditsRowsToSave,
          autocreditsTotals: debouncedAutocreditsTotals,
          isAutocreditsVerified: debouncedIsAutocreditsVerified,
        };

        await savePaymentByLoanId(loanId, payload);

        // update cache for next autosave
        setExistingPayment(payload);

        // optional toast every 5 sec max
        const now = Date.now();
        if (now - lastSaveAtRef.current > 5000) {
          lastSaveAtRef.current = now;
          // message.success("Auto-saved ✅"); // uncomment if you want
        }
      } catch (err) {
        console.error("Autosave Payments Error:", err);
        // keep silent to avoid spam
      }
    };

    autosave();
  }, [
    loanId,
    hasLoadedPayments,
    doRec,
    existingPayment,

    debouncedShowroomRows,
    debouncedEntryTotals,
    debouncedIsVerified,

    debouncedAutocreditsRows,
    debouncedAutocreditsTotals,
    debouncedIsAutocreditsVerified,
  ]);

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

    const customerNetOnRoadVehicleCost = asInt(
      doRec?.do_customer_netOnRoadVehicleCost || 0
    );
    const showroomNetOnRoadVehicleCost = asInt(
      doRec?.do_netOnRoadVehicleCost || 0
    );

    const autocreditsMargin =
      customerNetOnRoadVehicleCost - showroomNetOnRoadVehicleCost;

    const autocreditsExchangeDeduction =
      norm(exchangePurchasedBy) === "autocredits" ? exchangeValue : 0;

    const insuranceBy = String(doRec?.do_insuranceBy || "");
    const insuranceByNorm = norm(insuranceBy);
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

      onRoadVehicleCost,
      discountExclVehicleValue,

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

      customerNetOnRoadVehicleCost,
      showroomNetOnRoadVehicleCost,

      autocreditsExchangeDeduction,
      autocreditsInsuranceReceivable,

      autocreditsMargin,
    };
  }, [loan, doRec, loanId, entryTotals]);

  return (
    <div style={{ padding: 20 }}>
      <PaymentGlobalHeader data={showroomData} />

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
            autocreditsRows={autocreditsRows}
            setAutocreditsRows={setAutocreditsRows}
            autocreditsTotals={autocreditsTotals}
            setAutocreditsTotals={setAutocreditsTotals}
            isAutocreditsVerified={isAutocreditsVerified}
            setIsAutocreditsVerified={setIsAutocreditsVerified}
          />
        </div>
      </Card>
    </div>
  );
};

export default PaymentForm;
