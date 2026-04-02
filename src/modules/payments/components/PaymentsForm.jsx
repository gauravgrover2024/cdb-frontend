// src/modules/payments/components/PaymentForm.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, message, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { paymentsApi } from "../../../api/payments";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { useTheme } from "../../../context/ThemeContext";

import ShowroomPaymentHeader from "./showroom/ShowroomPaymentHeader";
import ShowroomVehicleDetailsSection from "./showroom/ShowroomVehicleDetailsSection";
import ShowroomPaymentsEntryTable from "./showroom/ShowroomPaymentsEntryTable";
import AutocreditsPaymentSection from "./autocredits/AutocreditsPaymentSection";

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const hasMeaningfulShowroomRows = (rows = []) =>
  Array.isArray(rows) &&
  rows.some((r) => {
    const amount = asInt(r?.paymentAmount);
    return Boolean(
      (!r?._auto &&
        (String(r?.paymentType || "").trim() ||
          String(r?.paymentMode || "").trim() ||
          String(r?.paymentMadeBy || "").trim() ||
          String(r?.remarks || "").trim())) ||
        amount > 0,
    );
  });

const isProvided = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

const pickDisbursedBankName = (loan = {}, doRec = {}) => {
  const banks = Array.isArray(loan?.approval_banksData)
    ? loan.approval_banksData
    : [];

  const disbursedBank = banks.find(
    (b) =>
      norm(b?.status) === "disbursed" &&
      String(b?.bankName || "").trim(),
  );
  const approvedBank = banks.find(
    (b) =>
      norm(b?.status) === "approved" &&
      String(b?.bankName || "").trim(),
  );

  const candidates = [
    loan?.disburse_bankName,
    disbursedBank?.bankName,
    loan?.postfile_bankName,
    loan?.approval_bankName,
    approvedBank?.bankName,
    doRec?.do_hypothecation,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  return "";
};

const getShowroomCommissionDate = (rows = []) => {
  if (!Array.isArray(rows)) return null;
  const commissionRows = rows.filter(
    (r) => r?.paymentType === "Commission" && r?.paymentDate,
  );
  if (!commissionRows.length) return null;
  const sorted = [...commissionRows].sort((a, b) => {
    const da = new Date(a.paymentDate).getTime() || 0;
    const db = new Date(b.paymentDate).getTime() || 0;
    return db - da;
  });
  return sorted[0].paymentDate;
};

const getLoanDisbursementDate = (loan = {}) => {
  const candidates = [
    loan?.disburse_date,
    loan?.disbursement_date,
    loan?.disbursementDate,
    loan?.disbursedDate,
    loan?.disburseDate,
    loan?.approval_disbursedDate,
    loan?.postfile_disbursementDate,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = dayjs(candidate);
    if (parsed.isValid()) return parsed;
  }
  return null;
};

const LEGACY_CUTOFF = dayjs("2026-02-01T00:00:00.000Z");
const PAYMENTS_AUTO_COMMISSION_META = "payments_negative_balance_commission_auto";

const detectReceivableKey = (loanDoc = {}) => {
  const keys = [
    "loan_receivables",
    "loanReceivables",
    "receivables",
    "loan_payouts",
  ];

  // Prefer key that already has entries to avoid writing into an empty alias
  // while real receivables live in another legacy key.
  for (const key of keys) {
    if (Array.isArray(loanDoc?.[key]) && loanDoc[key].length > 0) return key;
  }
  for (const key of keys) {
    if (Array.isArray(loanDoc?.[key])) return key;
  }
  return "loan_receivables";
};

const buildAutoCommissionPayoutId = (loanId) =>
  `PR-COMM-${String(loanId || "")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()}`;

const isAutoCommissionReceivable = (row = {}, loanId = "") => {
  const payoutId = String(row?.payoutId || "").trim();
  const expectedId = buildAutoCommissionPayoutId(loanId);
  return (
    String(row?.meta_source || "").trim() === PAYMENTS_AUTO_COMMISSION_META ||
    (expectedId && payoutId === expectedId)
  );
};

const computeNegativeShowroomBalance = ({
  doRec = {},
  entryTotals = {},
  crossAdjustmentNet = 0,
}) => {
  const showroomNetOnRoadVehicleCost = asInt(doRec?.do_netOnRoadVehicleCost || 0);
  const customerNetOnRoadVehicleCost = asInt(
    doRec?.do_customer_netOnRoadVehicleCost || 0,
  );
  const exchangeValue = asInt(doRec?.do_exchangeVehiclePrice || 0);
  const netOnRoadVehicleCost =
    showroomNetOnRoadVehicleCost > 0
      ? showroomNetOnRoadVehicleCost + exchangeValue
      : customerNetOnRoadVehicleCost;

  const insuranceAdj = asInt(entryTotals?.paymentAdjustmentInsuranceApplied || 0);
  const exchangeAdj = asInt(entryTotals?.paymentAdjustmentExchangeApplied || 0);
  const baseNetPayableToShowroom = Math.max(
    0,
    netOnRoadVehicleCost - insuranceAdj - exchangeAdj,
  );
  const netPayableToShowroom = baseNetPayableToShowroom + asInt(crossAdjustmentNet);

  const totalPaidToShowroom =
    asInt(entryTotals?.paymentAmountLoan || 0) +
    asInt(entryTotals?.paymentAmountAutocredits || 0) +
    asInt(entryTotals?.paymentAmountCustomer || 0);

  const balancePayment = netPayableToShowroom - totalPaidToShowroom;
  return balancePayment < 0 ? Math.abs(balancePayment) : 0;
};

const shouldBlockLegacyAutoCreate = (loan = {}) => {
  const disbDate = getLoanDisbursementDate(loan);
  if (!disbDate) return false;
  return disbDate.isBefore(LEGACY_CUTOFF);
};

// ---- API helpers (Mongo via Vercel API) ----
const fetchPaymentByLoanId = async (loanId) => {
  const res = await paymentsApi.getByLoanId(loanId);
  if (!res) return null;
  // Support both response shapes:
  // 1) { success: true, data: <paymentDoc|null> }
  // 2) direct paymentDoc
  if (Object.prototype.hasOwnProperty.call(res, "data")) {
    return res.data || null;
  }
  return res;
};

const savePaymentByLoanId = async (loanId, payload) => {
  return await paymentsApi.update(loanId, payload);
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
  const navigate = useNavigate();
  const { loanId } = useParams();
  const { isDarkMode } = useTheme();
  const [saving, setSaving] = useState(false);

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

  // Cross adjustment derived state
  const crossAdjustmentRows = useMemo(
    () =>
      (showroomRows || []).filter((r) => r.paymentType === "Cross Adjustment"),
    [showroomRows],
  );

  const crossAdjustmentNet = useMemo(
    () =>
      crossAdjustmentRows.reduce((sum, r) => {
        const amt = asInt(r.paymentAmount);
        if (!amt) return sum;
        // incoming = this case receives (positive), outgoing = gives (negative)
        return sum + (r.adjustmentDirection === "incoming" ? amt : -amt);
      }, 0),
    [crossAdjustmentRows],
  );

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

  const [hasLoadedLoanContext, setHasLoadedLoanContext] = useState(false);
  const [hasLoadedPayments, setHasLoadedPayments] = useState(false);
  const [paymentsLoadFailed, setPaymentsLoadFailed] = useState(false);

  // Keep latest saved doc in memory (so we don't GET before every autosave)
  const [existingPayment, setExistingPayment] = useState(null);
  const existingPaymentRef = useRef(null);
  const suppressAutosaveUntilRef = useRef(0);
  const legacyAutoCreateNoticeShownRef = useRef(false);
  const showroomRowsRef = useRef(showroomRows);
  const entryTotalsRef = useRef(entryTotals);
  const isVerifiedRef = useRef(isVerified);
  const autocreditsRowsRef = useRef(autocreditsRows);
  const autocreditsTotalsRef = useRef(autocreditsTotals);
  const isAutocreditsVerifiedRef = useRef(isAutocreditsVerified);

  // Debounced values (prevents saving on every keystroke)
  const debouncedShowroomRows = useDebounce(showroomRows, 800);
  const debouncedEntryTotals = useDebounce(entryTotals, 800);
  const debouncedIsVerified = useDebounce(isVerified, 800);

  const debouncedAutocreditsRows = useDebounce(autocreditsRows, 800);
  const debouncedAutocreditsTotals = useDebounce(autocreditsTotals, 800);
  const debouncedIsAutocreditsVerified = useDebounce(
    isAutocreditsVerified,
    800,
  );

  // Avoid toast spam
  const lastSaveAtRef = useRef(0);
  const commissionReceivableSyncSignatureRef = useRef(null);

  useEffect(() => {
    existingPaymentRef.current = existingPayment || null;
  }, [existingPayment]);

  useEffect(() => {
    showroomRowsRef.current = showroomRows;
  }, [showroomRows]);

  useEffect(() => {
    entryTotalsRef.current = entryTotals;
  }, [entryTotals]);

  useEffect(() => {
    isVerifiedRef.current = isVerified;
  }, [isVerified]);

  useEffect(() => {
    autocreditsRowsRef.current = autocreditsRows;
  }, [autocreditsRows]);

  useEffect(() => {
    autocreditsTotalsRef.current = autocreditsTotals;
  }, [autocreditsTotals]);

  useEffect(() => {
    isAutocreditsVerifiedRef.current = isAutocreditsVerified;
  }, [isAutocreditsVerified]);

  const syncNegativeBalanceCommissionReceivable = useCallback(
    async ({ totalsValue, crossAdjustmentNetValue, force = false }) => {
      if (!loanId) return;
      if (!loan) return;

      const receivableAmount = computeNegativeShowroomBalance({
        doRec: doRec || {},
        entryTotals: totalsValue || {},
        crossAdjustmentNet: crossAdjustmentNetValue || 0,
      });
      const partyName = String(
        doRec?.do_dealerName ||
          doRec?.dealerName ||
          loan?.dealerName ||
          "Showroom",
      ).trim();

      const signature = `${loanId}|${receivableAmount}|${partyName}`;
      if (!force && commissionReceivableSyncSignatureRef.current === signature) {
        return;
      }

      const loanLookupId = loan?._id || loanId;
      const loanRes = await loansApi.getById(loanLookupId);
      const freshLoan = loanRes?.data || null;
      if (!freshLoan) return;

      const receivableKey = detectReceivableKey(freshLoan);
      const existingRows = Array.isArray(freshLoan?.[receivableKey])
        ? freshLoan[receivableKey]
        : [];
      const existingAutoRow = existingRows.find((row) =>
        isAutoCommissionReceivable(row, freshLoan?.loanId || loanId),
      );
      const cleanedRows = existingRows.filter(
        (row) => !isAutoCommissionReceivable(row, freshLoan?.loanId || loanId),
      );
      const existingHistory = Array.isArray(existingAutoRow?.payment_history)
        ? existingAutoRow.payment_history
        : [];
      const existingHistoryTotal = existingHistory.reduce(
        (sum, entry) => sum + asInt(entry?.amount || 0),
        0,
      );
      let nextAutoStatus = existingAutoRow?.payout_status || "Expected";
      if (existingHistoryTotal <= 0) nextAutoStatus = "Expected";
      else if (existingHistoryTotal >= receivableAmount) nextAutoStatus = "Received";
      else nextAutoStatus = "Partial";

      const nextRows =
        receivableAmount > 0
          ? [
              ...cleanedRows,
              {
                ...(existingAutoRow || {}),
                id:
                  existingAutoRow?.id ||
                  buildAutoCommissionPayoutId(freshLoan?.loanId || loanId),
                payoutId: buildAutoCommissionPayoutId(
                  freshLoan?.loanId || loanId,
                ),
                payout_createdAt:
                  existingAutoRow?.payout_createdAt || new Date().toISOString(),
                created_date:
                  existingAutoRow?.created_date || new Date().toISOString(),
                payout_applicable: "Yes",
                payout_type: "Commission",
                payout_party_name: partyName || "Showroom",
                payout_percentage: "",
                payout_amount: receivableAmount,
                payout_direction: "Receivable",
                tds_applicable: "No",
                tds_percentage: 0,
                tds_amount: 0,
                net_payout_amount: receivableAmount,
                payout_status: nextAutoStatus,
                payout_expected_date: existingAutoRow?.payout_expected_date || null,
                payout_received_date:
                  nextAutoStatus === "Received"
                    ? existingAutoRow?.payout_received_date || new Date().toISOString()
                    : null,
                payment_history: existingHistory,
                activity_log:
                  Array.isArray(existingAutoRow?.activity_log) &&
                  existingAutoRow.activity_log.length > 0
                    ? existingAutoRow.activity_log
                    : [
                        {
                          timestamp: new Date().toISOString(),
                          action: "Auto synced from Payments",
                          details:
                            "Created from negative showroom balance in payment ledger.",
                        },
                      ],
                payout_remarks:
                  "Auto-created from negative showroom balance in payment ledger.",
                meta_source: PAYMENTS_AUTO_COMMISSION_META,
              },
            ]
          : cleanedRows;

      const hasChanged =
        JSON.stringify(existingRows || []) !== JSON.stringify(nextRows || []);

      if (!hasChanged) {
        commissionReceivableSyncSignatureRef.current = signature;
        return;
      }

      await loansApi.update(loanLookupId, { [receivableKey]: nextRows });
      commissionReceivableSyncSignatureRef.current = signature;
    },
    [doRec, loan, loanId],
  );

  // Load Loan + DO from API (fallback to sessionStorage if needed)
  useEffect(() => {
    if (!loanId) return;

    const load = async () => {
      let resolvedLoan = null;
      try {
        const loanRes = await loansApi.getById(loanId);
        resolvedLoan = loanRes?.data || null;
        setLoan(resolvedLoan);
      } catch (err) {
        const savedLoans = JSON.parse(
          sessionStorage.getItem("savedLoans") || "[]",
        );
        const foundLoan = (savedLoans || []).find((l) => l?.loanId === loanId);
        resolvedLoan = foundLoan || null;
        setLoan(resolvedLoan);
      }

      if (!resolvedLoan) {
        setDoRec(null);
        return;
      }

      const blockLegacyAutoCreate = shouldBlockLegacyAutoCreate(resolvedLoan || {});
      if (blockLegacyAutoCreate) {
        setDoRec(null);
      } else {
        try {
          const doRes = await deliveryOrdersApi.getByLoanId(loanId);
          setDoRec(doRes?.data || null);
        } catch (err) {
          const savedDOs = JSON.parse(sessionStorage.getItem("savedDOs") || "[]");
          const foundDO =
            (savedDOs || []).find((d) => d?.loanId === loanId) ||
            (savedDOs || []).find((d) => d?.do_loanId === loanId);
          setDoRec(foundDO || null);
        }
      }
    };

    load().finally(() => {
      setHasLoadedLoanContext(true);
    });
  }, [loanId]);

  // Load savedPayments (FULL DOC) from API
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedLoanContext) return;

    const load = async () => {
      if (!loan) {
        setExistingPayment(null);
        setHasLoadedPayments(true);
        return;
      }

      if (shouldBlockLegacyAutoCreate(loan || {})) {
        setExistingPayment(null);
        setHasLoadedPayments(true);
        return;
      }

      try {
        const found = await fetchPaymentByLoanId(loanId);
        const paymentDoc =
          found?.showroomRows ||
          found?.autocreditsRows ||
          found?.entryTotals ||
          found?.autocreditsTotals
            ? found
            : found?.data && typeof found.data === "object"
              ? found.data
              : null;

        setExistingPayment(paymentDoc || null);
        existingPaymentRef.current = paymentDoc || null;
        if (paymentDoc) {
          // Guard autosave while local state hydrates + debounce catches up
          suppressAutosaveUntilRef.current = Date.now() + 1800;
        }

        // Showroom
        if (Array.isArray(paymentDoc?.showroomRows))
          setShowroomRows(paymentDoc.showroomRows);

        if (paymentDoc?.entryTotals) {
          setEntryTotals((prev) => ({ ...prev, ...paymentDoc.entryTotals }));
        }

        if (paymentDoc?.isVerified === true) setIsVerified(true);
        if (paymentDoc?.isVerified === false) setIsVerified(false);

        // Autocredits
        if (Array.isArray(paymentDoc?.autocreditsRows)) {
          setAutocreditsRows(paymentDoc.autocreditsRows);
        }

        if (paymentDoc?.autocreditsTotals) {
          setAutocreditsTotals((prev) => ({
            ...prev,
            ...paymentDoc.autocreditsTotals,
          }));
        }

        if (typeof paymentDoc?.isAutocreditsVerified === "boolean") {
          setIsAutocreditsVerified(paymentDoc.isAutocreditsVerified);
        }
        setPaymentsLoadFailed(false);
      } catch (err) {
        console.error("Load Payments Error:", err);
        setPaymentsLoadFailed(true);
      } finally {
        setHasLoadedPayments(true);
      }
    };

    load();
  }, [loanId, hasLoadedLoanContext, loan]);

  // Autosave (FULL DOC) via API (Debounced + Single Document)
  useEffect(() => {
    if (!loanId) return;
    if (!hasLoadedLoanContext) return;
    if (!hasLoadedPayments) return;
    if (paymentsLoadFailed) return;
    if (Date.now() < suppressAutosaveUntilRef.current) return;

    const autosave = async () => {
      try {
        const hasExistingPaymentDoc = Boolean(
          existingPaymentRef.current?._id ||
            existingPaymentRef.current?.loanId ||
            existingPaymentRef.current?.id,
        );
        if (!hasExistingPaymentDoc && !loan) return;
        const blockLegacyAutoCreate =
          !hasExistingPaymentDoc && shouldBlockLegacyAutoCreate(loan || {});
        if (blockLegacyAutoCreate) {
          if (!legacyAutoCreateNoticeShownRef.current) {
            legacyAutoCreateNoticeShownRef.current = true;
            message.info(
              "Auto payment creation is paused for cases delivered/disbursed before 1 Feb 2026.",
            );
          }
          return;
        }

        const existing = existingPaymentRef.current || null;

        // ---- Commission replicate logic: showroom -> autocredits ----
        const latestShowroomRows = showroomRowsRef.current || [];
        const latestEntryTotals = entryTotalsRef.current || {};
        const latestIsVerified = Boolean(isVerifiedRef.current);
        const latestAutocreditsRows = autocreditsRowsRef.current || [];
        const latestAutocreditsTotals = autocreditsTotalsRef.current || {};
        const latestIsAutocreditsVerified = Boolean(
          isAutocreditsVerifiedRef.current,
        );

        const existingShowroomRows = Array.isArray(existing?.showroomRows)
          ? existing.showroomRows
          : [];
        const existingHasMeaningfulRows =
          hasMeaningfulShowroomRows(existingShowroomRows);
        const latestHasMeaningfulRows =
          hasMeaningfulShowroomRows(latestShowroomRows);
        // Critical safety:
        // never overwrite a meaningful saved sheet with a temporary default snapshot
        // (common during initial mount before full hydration).
        if (existingHasMeaningfulRows && !latestHasMeaningfulRows) {
          return;
        }

        const showroomCommission = asInt(
          latestEntryTotals?.paymentCommissionReceived || 0,
        );

        const commissionDate = getShowroomCommissionDate(latestShowroomRows);

        const baseAutocreditsRows = Array.isArray(latestAutocreditsRows)
          ? latestAutocreditsRows
          : [];

        const hasCommissionRow = baseAutocreditsRows.some(
          (r) =>
            Array.isArray(r.receiptTypes) &&
            r.receiptTypes.includes("Commission"),
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
          showroomRows: latestShowroomRows,
          entryTotals: latestEntryTotals,
          isVerified: latestIsVerified,

          // Autocredits
          autocreditsRows: autocreditsRowsToSave,
          autocreditsTotals: latestAutocreditsTotals,
          isAutocreditsVerified: latestIsAutocreditsVerified,
        };

        const saveRes = await savePaymentByLoanId(loanId, payload);
        if (saveRes?.skipped || saveRes?.data === null) return;

        // update cache for next autosave
        const latest = saveRes?.data || payload;
        setExistingPayment(latest);
        existingPaymentRef.current = latest;

        const latestCrossAdjustmentNet = (latestShowroomRows || [])
          .filter((row) => row?.paymentType === "Cross Adjustment")
          .reduce((sum, row) => {
            const amount = asInt(row?.paymentAmount || 0);
            if (!amount) return sum;
            return sum + (row?.adjustmentDirection === "incoming" ? amount : -amount);
          }, 0);
        await syncNegativeBalanceCommissionReceivable({
          totalsValue: latestEntryTotals,
          crossAdjustmentNetValue: latestCrossAdjustmentNet,
        });

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
    loan,
    hasLoadedPayments,
    hasLoadedLoanContext,
    paymentsLoadFailed,
    doRec,
    debouncedShowroomRows,
    debouncedEntryTotals,
    debouncedIsVerified,
    debouncedAutocreditsRows,
    debouncedAutocreditsTotals,
    debouncedIsAutocreditsVerified,
    syncNegativeBalanceCommissionReceivable,
  ]);

  const buildPaymentPayload = ({
    rowsValue,
    totalsValue,
    verifiedValue,
    autocreditsRowsValue,
    autocreditsTotalsValue,
    autocreditsVerifiedValue,
  }) => {
    const existing = existingPaymentRef.current || {};
    const showroomCommission = asInt(totalsValue?.paymentCommissionReceived || 0);
    const commissionDate = getShowroomCommissionDate(rowsValue);
    const baseAutocreditsRows = Array.isArray(autocreditsRowsValue)
      ? autocreditsRowsValue
      : [];
    const hasCommissionRow = baseAutocreditsRows.some(
      (r) => Array.isArray(r.receiptTypes) && r.receiptTypes.includes("Commission"),
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

    return {
      ...existing,
      loanId,
      do_loanId: doRec?.do_loanId || loanId,
      updatedAt: new Date().toISOString(),
      showroomRows: rowsValue,
      entryTotals: totalsValue,
      isVerified: verifiedValue,
      autocreditsRows: autocreditsRowsToSave,
      autocreditsTotals: autocreditsTotalsValue,
      isAutocreditsVerified: autocreditsVerifiedValue,
    };
  };

  const persistPaymentNow = async ({ exitAfterSave = false } = {}) => {
    if (!loanId) return;
    setSaving(true);
    try {
      const hasExistingPaymentDoc = Boolean(
        existingPaymentRef.current?._id ||
          existingPaymentRef.current?.loanId ||
          existingPaymentRef.current?.id,
      );
      if (!hasExistingPaymentDoc && !loan) {
        message.warning("Loan context missing. Please refresh.");
        return;
      }
      const blockLegacyAutoCreate =
        !hasExistingPaymentDoc && shouldBlockLegacyAutoCreate(loan || {});
      if (blockLegacyAutoCreate) {
        message.info(
          "Payment creation is paused for cases delivered/disbursed before 1 Feb 2026.",
        );
        return;
      }

      const payload = buildPaymentPayload({
        rowsValue: showroomRows,
        totalsValue: entryTotals,
        verifiedValue: isVerified,
        autocreditsRowsValue: autocreditsRows,
        autocreditsTotalsValue: autocreditsTotals,
        autocreditsVerifiedValue: isAutocreditsVerified,
      });
      const saveRes = await savePaymentByLoanId(loanId, payload);
      if (!saveRes?.skipped && saveRes?.data !== null) {
        const latest = saveRes?.data || payload;
        setExistingPayment(latest);
        existingPaymentRef.current = latest;
      }
      try {
        await syncNegativeBalanceCommissionReceivable({
          totalsValue: entryTotals,
          crossAdjustmentNetValue: crossAdjustmentNet,
          force: true,
        });
      } catch (syncErr) {
        console.error("Commission receivable sync failed:", syncErr);
      }
      // Guard against a delayed autosave run that may still carry old debounced snapshot
      suppressAutosaveUntilRef.current = Date.now() + 2000;
      message.success("Payment saved");
      if (exitAfterSave) navigate("/payments");
    } catch (err) {
      console.error("Manual save payment error:", err);
      message.error("Unable to save payment");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardAndExit = () => {
    navigate("/payments");
  };

  const showroomData = useMemo(() => {
    const financed = norm(loan?.isFinanced) === "yes";

    const customerName = loan?.customerName || doRec?.customerName || "—";

    const showroomInsuranceAmount = asInt(doRec?.do_insuranceCost || 0);
    const hasCustomerInsurance = isProvided(doRec?.do_customer_insuranceCost);
    const customerInsuranceAmount = asInt(doRec?.do_customer_insuranceCost || 0);
    const actualInsurancePremium = asInt(
      doRec?.do_customer_actualInsurancePremium || 0,
    );
    const insuranceAmountForReceivable = hasCustomerInsurance
      ? customerInsuranceAmount
      : showroomInsuranceAmount;

    const doRefNo =
      doRec?.do_refNo || doRec?.doRefNo || doRec?.refNo || doRec?.ref_no || "—";

    const loanRefNo =
      loan?.loanId || doRec?.do_loanId || doRec?.loanId || loanId || "—";

    const dealerName = doRec?.do_dealerName || doRec?.dealerName || "—";
    const dealerContactPerson = doRec?.do_dealerContactPerson || "";
    const dealerContactNumber = doRec?.do_dealerMobile || "";
    const dealerAddress = doRec?.do_dealerAddress || "";

    const onRoadVehicleCost = asInt(doRec?.do_onRoadVehicleCost || 0);
    // Point 3: use the corrected effective discount stored by Section5 (after exchange add-back)
    const discountExclVehicleValue = asInt(
      doRec?.do_selectedEffectiveTotalDiscount ??
        doRec?.do_selectedDiscountExclVehicleValue ??
        doRec?.do_totalDiscount ??
        0,
    );

    const make = doRec?.do_vehicleMake || loan?.vehicleMake || "—";
    const model = doRec?.do_vehicleModel || loan?.vehicleModel || "—";
    const variant = doRec?.do_vehicleVariant || loan?.vehicleVariant || "—";
    const color =
      doRec?.do_colour ||
      doRec?.do_vehicleColor ||
      doRec?.vehicleColor ||
      loan?.vehicleColor ||
      loan?.colour ||
      loan?.color ||
      "";

    const hypothecationBank = pickDisbursedBankName(loan, doRec) || "—";

    const exchangeValue = asInt(doRec?.do_exchangeVehiclePrice || 0);
    const purchaseDate = doRec?.do_exchangePurchaseDate || null;
    const exchangePurchasedBy = String(doRec?.do_exchangePurchasedBy || "");

    const customerNetOnRoadVehicleCost = asInt(
      doRec?.do_customer_netOnRoadVehicleCost || 0,
    );
    const loanPaymentPrefill = asInt(doRec?.do_financeDeduction || 0);
    const disbursementDateObj = getLoanDisbursementDate(loan);
    const loanDisbursementDate = disbursementDateObj
      ? disbursementDateObj.toISOString()
      : null;

    const doMarginMoney = asInt(doRec?.do_marginMoneyPaid || 0);

    const showroomNetOnRoadVehicleCost = asInt(
      doRec?.do_netOnRoadVehicleCost || 0,
    );
    // Critical fix: showroom payment net should follow showroom DO account plus
    // showroom exchange add-back value (not customer-net fallback differences).
    const netOnRoadVehicleCost =
      showroomNetOnRoadVehicleCost > 0
        ? showroomNetOnRoadVehicleCost + exchangeValue
        : customerNetOnRoadVehicleCost;

    const autocreditsExchangeDeduction =
      norm(exchangePurchasedBy) === "autocredits" ? exchangeValue : 0;

    const insuranceBy = String(
      doRec?.do_customer_insuranceBy || doRec?.do_insuranceBy || "",
    );
    const insuranceByNorm = norm(insuranceBy);
    const isAutocreditsInsurance = insuranceByNorm.includes("autocredits");

    const customerNetWithoutInsurance =
      customerNetOnRoadVehicleCost - customerInsuranceAmount;
    const marginPartFromOnRoadDelta = isAutocreditsInsurance
      ? customerNetWithoutInsurance - showroomNetOnRoadVehicleCost
      : customerNetOnRoadVehicleCost - showroomNetOnRoadVehicleCost;
    const marginPartFromInsuranceSpread = isAutocreditsInsurance
      ? customerInsuranceAmount - actualInsurancePremium
      : 0;
    const autocreditsMargin =
      marginPartFromOnRoadDelta + marginPartFromInsuranceSpread;
    const autocreditsMarginBreakup = {
      mode: isAutocreditsInsurance ? "autocredits_insurance" : "standard",
      insuranceBy,
      showroomNetOnRoadVehicleCost,
      customerNetOnRoadVehicleCost,
      customerInsuranceAmount,
      actualInsurancePremium,
      customerNetWithoutInsurance,
      marginPartFromOnRoadDelta,
      marginPartFromInsuranceSpread,
      autocreditsMargin,
    };

    // Rules:
    // 1) Showroom adjustment entry uses SHOWROOM insurance only (no customer fallback)
    //    and only when insurance is by Autocredits.
    // 2) Autocredits receivable uses customer insurance first, else showroom insurance,
    //    and only when insurance is by Autocredits.
    const showroomInsuranceForAdjustment = isAutocreditsInsurance
      ? showroomInsuranceAmount
      : 0;
    const autocreditsInsuranceReceivable = isAutocreditsInsurance
      ? insuranceAmountForReceivable
      : 0;

    // Detailed DO breakup fields (for payment side summary)
    const exShowroomPrice = asInt(doRec?.do_exShowroomPrice || 0);
    const tcs = asInt(doRec?.do_tcs || 0);
    const epc = asInt(doRec?.do_epc || 0);
    const roadTax = asInt(doRec?.do_roadTax || 0);
    const accessoriesAmount = asInt(doRec?.do_accessoriesAmount || 0);
    const fastag = asInt(doRec?.do_fastag || 0);
    const extendedWarranty = asInt(doRec?.do_extendedWarranty || 0);

    const dealerDiscount = asInt(doRec?.do_dealerDiscount || 0);
    const schemeDiscount = asInt(doRec?.do_schemeDiscount || 0);
    const insuranceCashback = asInt(doRec?.do_insuranceCashback || 0);
    const exchange = asInt(doRec?.do_exchange || 0);
    const loyalty = asInt(doRec?.do_loyalty || 0);
    const corporate = asInt(doRec?.do_corporate || 0);

    // If you later store totals for others, wire them here; for now 0
    const additionsOthersTotal = asInt(doRec?.do_additions_othersTotal || 0);
    const discountsOthersTotal = asInt(doRec?.do_discounts_othersTotal || 0);

    return {
      customerName,
      doRefNo,
      loanRefNo,

      dealerName,
      dealerContactPerson,
      dealerContactNumber,
      dealerAddress,

      insuranceAmount: showroomInsuranceForAdjustment,
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
      do_colour: color,
      do_vehicleColor: color,

      customerNetOnRoadVehicleCost,
      showroomNetOnRoadVehicleCost,
      do_customer_actualInsurancePremium: actualInsurancePremium,

      autocreditsExchangeDeduction,
      autocreditsInsuranceReceivable,

      autocreditsMargin,
      autocreditsMarginBreakup,

      // Detailed DO breakup fields
      do_onRoadVehicleCost: onRoadVehicleCost,
      do_totalDiscount: discountExclVehicleValue,
      do_netOnRoadVehicleCost: showroomNetOnRoadVehicleCost,

      do_exShowroomPrice: exShowroomPrice,
      do_tcs: tcs,
      do_epc: epc,
      do_insuranceCost: showroomInsuranceAmount,
      do_roadTax: roadTax,
      do_accessoriesAmount: accessoriesAmount,
      do_fastag: fastag,
      do_extendedWarranty: extendedWarranty,
      do_marginMoneyPaid: doMarginMoney,

      do_dealerDiscount: dealerDiscount,
      do_schemeDiscount: schemeDiscount,
      do_insuranceCashback: insuranceCashback,
      do_exchange: exchange,
      do_exchangeVehiclePrice: exchangeValue,
      do_loyalty: loyalty,
      do_corporate: corporate,
      do_additions_othersTotal: additionsOthersTotal,
      do_discounts_othersTotal: discountsOthersTotal,
    };
  }, [loan, doRec, loanId, entryTotals]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDarkMode
          ? "linear-gradient(180deg, #090b10 0%, #111111 24%, #161616 100%)"
          : "linear-gradient(180deg, #edf5ff 0%, #f8fafc 30%, #ffffff 100%)",
        color: isDarkMode ? "#f5f5f5" : "#111827",
        padding: "0 16px 32px",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
            position: "sticky",
            top: 64,
            zIndex: 80,
            color: isDarkMode ? "#f5f5f5" : "#111827",
            padding: "10px 14px",
            borderRadius: 20,
            border: `1px solid ${isDarkMode ? "#252525" : "#dce8f6"}`,
            background: isDarkMode
              ? "rgba(20,20,20,0.82)"
              : "rgba(255,255,255,0.78)",
            backdropFilter: "blur(18px)",
            boxShadow: isDarkMode
              ? "0 18px 40px rgba(0,0,0,0.28)"
              : "0 18px 40px rgba(59,130,246,0.08)",
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/payments")}
          >
            Back
          </Button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button danger onClick={handleDiscardAndExit}>
              Discard & Exit
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => persistPaymentNow({ exitAfterSave: true })}
            >
              Save & Exit
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => persistPaymentNow()}
            >
              Save
            </Button>
          </div>
        </div>

        <Card
          style={{
            borderRadius: 28,
            marginBottom: 18,
            overflow: "hidden",
            border: `1px solid ${isDarkMode ? "#2a2f39" : "#dbe7f4"}`,
            background: isDarkMode
              ? "linear-gradient(135deg, rgba(20,24,32,0.98) 0%, rgba(17,17,17,0.98) 100%)"
              : "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.98) 100%)",
            boxShadow: isDarkMode
              ? "0 28px 60px rgba(0,0,0,0.35)"
              : "0 28px 60px rgba(37,99,235,0.10)",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: 20 }}>
            <Tag color="cyan" style={{ marginBottom: 8 }}>
              PAYMENT WORKSPACE
            </Tag>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.08 }}>
              Payments Workspace
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 15,
                color: isDarkMode ? "#cbd5e1" : "#64748b",
              }}
            >
              Review showroom and autocredits ledgers in one place before settlement.
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Tag color="blue">Loan ID: {loanId || "—"}</Tag>
              <Tag color="purple">DO Ref: {showroomData?.doRefNo || "—"}</Tag>
              <Tag color={existingPayment ? "green" : "orange"}>
                {existingPayment ? "Existing Payment" : "New Payment"}
              </Tag>
            </div>
          </div>
        </Card>

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
                  key={`showroom-entry-${loanId || "new"}`}
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
                  crossAdjustmentNet={crossAdjustmentNet}
                  crossAdjustmentRows={crossAdjustmentRows}
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
    </div>
  );
};

export default PaymentForm;
