import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const INSURANCE_ADDON_CATALOG = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

export const INSURANCE_ENTRY_TYPES = {
  INSURER_PAYMENT: "INSURER_PAYMENT",
  CUSTOMER_RECEIPT: "CUSTOMER_RECEIPT",
  SUBVENTION_NON_RECOVERABLE: "SUBVENTION_NON_RECOVERABLE",
  SUBVENTION_REFUND: "SUBVENTION_REFUND",
};

export const INSURER_SETTLEMENT_MODE = {
  NONE: "NONE",
  AUTOCREDITS: "AUTOCREDITS",
  CUSTOMER: "CUSTOMER",
  MIXED: "MIXED",
};

/** `null` does not trigger default params — normalize before field access. */
export const coerceInsuranceRecord = (record) =>
  record && typeof record === "object" ? record : {};

export const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "n/a";
};

export const pickPolicyValue = (...args) => {
  for (const val of args) {
    if (hasDisplayValue(val)) return String(val).trim();
  }
  return "";
};

export const pickPolicyNumber = (primary, fallback = 0) => {
  const a = Number(primary);
  if (Number.isFinite(a) && a > 0) return a;
  const b = Number(fallback);
  return Number.isFinite(b) ? b : 0;
};

export const parseInsuranceDate = (value) => {
  if (!hasDisplayValue(value)) return null;
  const parsed = dayjs(
    String(value).trim(),
    [
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      "DD-MM-YYYY",
      "D/M/YYYY",
      "D-M-YYYY",
      "DD MMM YYYY",
      "D MMM YYYY",
    ],
    true,
  );
  if (parsed.isValid()) return parsed;
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback : null;
};

const isThirdPartyOnlyPolicy = (policyType) => {
  const value = String(policyType || "")
    .trim()
    .toLowerCase();
  return value.includes("third") || value === "tp";
};

export const getInsuranceQuoteRowId = (quote, index = 0) =>
  quote?.id ?? quote?._id ?? quote?.quoteId ?? `quote-${index}`;

export const computeInsuranceQuoteBreakup = (quote) => {
  if (!quote || typeof quote !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      ncbAmount: 0,
      totalPremium: 0,
    };
  }
  const addOns =
    quote.addOns && typeof quote.addOns === "object" ? quote.addOns : {};
  const included =
    quote.addOnsIncluded && typeof quote.addOnsIncluded === "object"
      ? quote.addOnsIncluded
      : {};
  const coverageType = String(quote.coverageType || "Comprehensive");
  const isThirdPartyOnly = coverageType === "Third Party";
  const isOdOnly =
    coverageType === "Own Damage" || coverageType === "Stand Alone OD";
  const includesOd = !isThirdPartyOnly;
  const includesTp = !isOdOnly;
  const allowsAddOns = includesOd;
  const selectedAddOnsTotal = INSURANCE_ADDON_CATALOG.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);
  const hasAnySelectedAddOn = INSURANCE_ADDON_CATALOG.some((name) =>
    Boolean(included[name]),
  );
  const flatAddOnsAmount = Number(quote.addOnsAmount || 0);
  const hasFlatOverride =
    flatAddOnsAmount > 0 &&
    hasAnySelectedAddOn &&
    Math.round(flatAddOnsAmount) !== Math.round(selectedAddOnsTotal);
  const addOnsTotal = allowsAddOns
    ? hasAnySelectedAddOn
      ? hasFlatOverride
        ? flatAddOnsAmount
        : selectedAddOnsTotal
      : flatAddOnsAmount
    : 0;
  const odAmt = includesOd
    ? Number(
        quote.odAmount ??
          quote.ownDamage ??
          quote.basicOwnDamage ??
          quote.odPremium ??
          0,
      )
    : 0;
  const tpAmt = includesTp
    ? Number(
        quote.thirdPartyAmount ??
          quote.thirdParty ??
          quote.basicThirdParty ??
          quote.tpPremium ??
          0,
      )
    : 0;
  const ncbPct = Number(
    quote.ncbDiscount ?? quote.newNcbDiscount ?? quote.ncb_percentage ?? 0,
  );
  const ncbAmount = Math.round((odAmt * ncbPct) / 100);
  const taxableAmount = Math.max(odAmt + tpAmt + addOnsTotal - ncbAmount, 0);
  const gstAmount = Math.round(taxableAmount * 0.18);
  const computedTotalPremium = taxableAmount + gstAmount;
  const storedTotalPremium = Number(
    quote.totalPremium ??
      quote.newTotalPremium ??
      quote.grossPremium ??
      quote.finalPremium ??
      0,
  );
  const totalPremium =
    Number.isFinite(storedTotalPremium) && storedTotalPremium > 0
      ? storedTotalPremium
      : computedTotalPremium;
  const idvParts =
    Number(quote.vehicleIdv || 0) +
    Number(quote.cngIdv || 0) +
    Number(quote.accessoriesIdv || 0);
  const storedIdv = Number(quote.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;
  return { addOnsTotal, odAmt, tpAmt, totalIdv, ncbAmount, totalPremium, ncbPct };
};

export const getAcceptedQuoteContext = (record) => {
  const safe = coerceInsuranceRecord(record);
  const quotes = Array.isArray(safe.quotes) ? safe.quotes : [];
  const acceptedQuoteId =
    safe.acceptedQuoteId || safe.accepted_quote_id || null;
  const acceptedQuote =
    safe.acceptedQuote ||
    quotes.find(
      (q, idx) =>
        String(getInsuranceQuoteRowId(q, idx)) === String(acceptedQuoteId),
    ) ||
    null;
  const acceptedBreakup = computeInsuranceQuoteBreakup(acceptedQuote);
  return { acceptedQuote, acceptedBreakup };
};

export const premiumNum = (record) => {
  const safe = coerceInsuranceRecord(record);
  const { acceptedQuote, acceptedBreakup } = getAcceptedQuoteContext(safe);
  const acceptedPremium = Number(
    acceptedQuote?.totalPremium ??
      acceptedQuote?.grossPremium ??
      acceptedQuote?.finalPremium ??
      acceptedBreakup?.totalPremium ??
      0,
  );
  if (Number.isFinite(acceptedPremium) && acceptedPremium > 0)
    return acceptedPremium;
  const fallback = pickPolicyNumber(
    safe.newTotalPremium ?? safe.new_total_premium,
    safe.previousTotalPremium ?? safe.totalPremium,
  );
  return Number.isFinite(fallback) ? fallback : 0;
};

export const getPolicyPulseExpiryDate = (record) => {
  const safe = coerceInsuranceRecord(record);
  const policyType = pickPolicyValue(
    safe.newPolicyType,
    safe.previousPolicyType,
  );

  if (isThirdPartyOnlyPolicy(policyType)) {
    return (
      pickPolicyValue(safe.newTpExpiryDate, safe.previousTpExpiryDate) ||
      safe.policyExpiry ||
      ""
    );
  }

  return (
    pickPolicyValue(safe.newOdExpiryDate, safe.previousOdExpiryDate) ||
    pickPolicyValue(safe.newTpExpiryDate, safe.previousTpExpiryDate) ||
    safe.policyExpiry ||
    ""
  );
};

export const getCycleAdjustedExpiryDate = (expiryDateStr, baseDate = dayjs()) => {
  if (!expiryDateStr) return null;
  const parsed = parseInsuranceDate(expiryDateStr);
  if (!parsed || !parsed.isValid()) return null;

  const base = dayjs(baseDate).startOf("day");
  let candidate = parsed.year(base.year()).startOf("day");
  const diffDays = candidate.diff(base, "day");

  if (diffDays < -45) {
    candidate = candidate.add(1, "year");
  } else if (diffDays > 365) {
    candidate = candidate.subtract(1, "year");
  }

  return candidate;
};

export const daysUntilExpiry = (record) => {
  const expiryDate = getPolicyPulseExpiryDate(record);
  if (!expiryDate) return null;
  const parsed = parseInsuranceDate(expiryDate);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.startOf("day").diff(dayjs().startOf("day"), "day");
};

export const getPolicyPulseMeta = (days, alreadyRenewed = false) => {
  if (alreadyRenewed) {
    return {
      label: "Already Renewed",
      detail: "Renewal case created",
      color: "#2563eb",
      bg: "#eff6ff",
    };
  }
  if (days === null || !Number.isFinite(Number(days))) {
    return {
      label: "Pending",
      detail: "Expiry not captured",
      color: "#64748b",
      bg: "#f8fafc",
    };
  }
  if (days < 0) {
    return {
      label: "Expired",
      detail: `${Math.abs(days)}d overdue`,
      color: "#dc2626",
      bg: "#fef2f2",
    };
  }
  if (days <= 45) {
    return {
      label: "Expiring Soon",
      detail: `${days} days remaining`,
      color: "#b45309",
      bg: "#fffbeb",
    };
  }
  return {
    label: "Active",
    detail: `${days} days remaining`,
    color: "#047857",
    bg: "#ecfdf5",
  };
};

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const inferInsuranceEntryType = (row = {}) => {
  if (row.entryType) return row.entryType;
  if (row.paymentType === "inhouse")
    return INSURANCE_ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer")
    return INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT;
  if (row.paymentType === "subvention_nr")
    return INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
  if (row.paymentType === "adjustment")
    return INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND;
  return INSURANCE_ENTRY_TYPES.INSURER_PAYMENT;
};

export const normalizeInsuranceLedgerRow = (row = {}, index = 0) => {
  const entryType = inferInsuranceEntryType(row);
  const paidByRaw = String(
    row.paidBy || row.paymentBy || row.paymentMadeBy || "",
  ).trim();
  let paidBy = paidByRaw;
  if (entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT) paidBy = "Customer";
  if (
    entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND ||
    entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
  ) {
    paidBy = "Autocredits";
  }
  if (entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT && !paidBy) {
    paidBy =
      String(row.paymentType || "").toLowerCase() === "customer"
        ? "Customer"
        : "Autocredits";
  }
  return {
    _id:
      row._id ||
      row.id ||
      `${entryType}-${row.date || row.paymentDate || row.createdAt || "row"}-${index}`,
    entryType,
    paidBy,
    date:
      row.date ??
      row.paymentDate ??
      row.receiptDate ??
      row.recordedAt ??
      row.createdAt ??
      null,
    amount: toAmount(row.amount),
  };
};

const sortLedgerByDate = (rows = []) =>
  [...rows].sort((a, b) => {
    const aDate = dayjs(a.date);
    const bDate = dayjs(b.date);
    if (!aDate.isValid() && !bDate.isValid()) return 0;
    if (!aDate.isValid()) return 1;
    if (!bDate.isValid()) return -1;
    return aDate.valueOf() - bDate.valueOf();
  });

export const computeInsurancePaymentTotals = (rows = [], premium = 0) => {
  const insurerPaidByAutocredits = rows
    .filter(
      (r) =>
        r.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "autocredits",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const insurerPaidByCustomer = rows
    .filter(
      (r) =>
        r.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "customer",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const customerRecovered = rows
    .filter((r) => r.entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const subventionNotRecoverable = rows
    .filter(
      (r) => r.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE,
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const subventionRefundPaid = rows
    .filter((r) => r.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const insurerPaidTotal = insurerPaidByAutocredits + insurerPaidByCustomer;
  const insurerOutstanding = Math.max(0, premium - insurerPaidTotal);
  const insurerSettlementMode =
    insurerPaidByCustomer > 0 && insurerPaidByAutocredits === 0
      ? INSURER_SETTLEMENT_MODE.CUSTOMER
      : insurerPaidByAutocredits > 0 && insurerPaidByCustomer === 0
        ? INSURER_SETTLEMENT_MODE.AUTOCREDITS
        : insurerPaidByAutocredits > 0 && insurerPaidByCustomer > 0
          ? INSURER_SETTLEMENT_MODE.MIXED
          : INSURER_SETTLEMENT_MODE.NONE;
  const receiptEntryVisible =
    insurerSettlementMode === INSURER_SETTLEMENT_MODE.NONE ||
    insurerSettlementMode === INSURER_SETTLEMENT_MODE.AUTOCREDITS;
  const customerNetReceivableWhenAcPays = receiptEntryVisible
    ? Math.max(0, premium - subventionNotRecoverable)
    : 0;
  const customerOutstandingToAc = receiptEntryVisible
    ? Math.max(0, customerNetReceivableWhenAcPays - customerRecovered)
    : 0;
  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundPaid,
    insurerSettlementMode,
    receiptEntryVisible,
  };
};

/** Last issued / expiring policy — prefers new* (workflow) then previous* (renewal copy). */
export const resolveActivePolicySnapshot = (record) => {
  const safe = coerceInsuranceRecord(record);
  const { acceptedQuote, acceptedBreakup } = getAcceptedQuoteContext(safe);

  const insuranceCompany = pickPolicyValue(
    safe.newInsuranceCompany,
    safe.previousInsuranceCompany,
  );
  const policyNumber = pickPolicyValue(
    safe.newPolicyNumber,
    safe.previousPolicyNumber,
  );
  const policyType = pickPolicyValue(
    safe.newPolicyType,
    safe.previousPolicyType,
  );
  const odExpiryDate = pickPolicyValue(
    safe.newOdExpiryDate,
    safe.previousOdExpiryDate,
  );
  const tpExpiryDate = pickPolicyValue(
    safe.newTpExpiryDate,
    safe.previousTpExpiryDate,
  );
  const ncbDiscount = Number(
    pickPolicyValue(
      safe.newNcbDiscount ?? safe.newNcb,
      safe.previousNcbDiscount,
    ) || acceptedQuote?.ncbDiscount || 0,
  );

  const ownDamage = pickPolicyNumber(
    acceptedBreakup?.odAmt ||
      safe.newOwnDamageAmount ||
      safe.newOdAmount,
    safe.previousOwnDamageAmount || safe.previousOdAmount,
  );
  const thirdParty = pickPolicyNumber(
    acceptedBreakup?.tpAmt ||
      safe.newThirdPartyAmount ||
      safe.newTpAmount,
    safe.previousThirdPartyAmount || safe.previousTpAmount,
  );
  const addOnsTotal = pickPolicyNumber(
    acceptedBreakup?.addOnsTotal || safe.newAddOnsTotal,
    safe.previousAddOnsTotal,
  );
  const totalPremium = pickPolicyNumber(
    premiumNum(safe),
    safe.previousTotalPremium,
  );

  const expiryDate = getPolicyPulseExpiryDate(safe);
  const parsedExpiry = parseInsuranceDate(expiryDate);
  const expiryLabel = parsedExpiry ? parsedExpiry.format("DD MMM YYYY") : "—";
  const expiryDays = daysUntilExpiry(safe);

  const ncbAmount =
    Number(acceptedBreakup?.ncbAmount || 0) ||
    Math.round((ownDamage * ncbDiscount) / 100);

  return {
    insuranceCompany,
    policyNumber,
    policyType,
    ncbDiscount,
    odExpiryDate,
    tpExpiryDate,
    ownDamage,
    ownDamageBeforeNcb: pickPolicyNumber(
      safe.newOwnDamageBeforeNcb || safe.previousOwnDamageBeforeNcb,
      ownDamage + ncbAmount,
    ),
    thirdParty,
    basicThirdParty: pickPolicyNumber(
      safe.newBasicThirdPartyAmount || safe.previousBasicThirdPartyAmount,
      thirdParty,
    ),
    addOnsTotal,
    totalPremium,
    ncbAmount,
    expiryDate,
    expiryLabel,
    expiryDays,
    acceptedQuote,
    acceptedBreakup,
    usesIssuedPolicyFields: hasDisplayValue(safe.newInsuranceCompany)
      || hasDisplayValue(safe.newPolicyNumber)
      || hasDisplayValue(safe.newOdExpiryDate)
      || hasDisplayValue(safe.newTpExpiryDate),
  };
};

export const parsePolicyIncludedAddons = (record, snapshot = null) => {
  const safe = coerceInsuranceRecord(record);
  const active = snapshot || resolveActivePolicySnapshot(safe);
  const { acceptedQuote } = active;

  const candidates = [
    acceptedQuote?.includedAddons,
    acceptedQuote?.includedAddOns,
    safe.newIncludedAddons,
    safe.newIncludedAddOns,
    safe.previousIncludedAddons,
    safe.previousIncludedAddOns,
    safe.includedAddons,
    safe.includedAddOns,
    safe.previousAddOns,
    safe.previousAddonDetails,
    safe.previousAddOnsDetails,
    safe.previousAddOnsBreakup,
  ];

  const normalizeArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === "string") return { name: item, amt: 0 };
        if (!item || typeof item !== "object") return null;
        return {
          name: String(item.name || item.label || item.addOn || "").trim(),
          amt: Number(item.amt ?? item.amount ?? item.value ?? 0),
        };
      })
      .filter((item) => item?.name);
  };

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      const list = normalizeArray(candidate);
      if (list.length > 0) return list;
    }
    if (typeof candidate === "object") {
      const list = Object.entries(candidate)
        .filter(([, val]) => Boolean(val))
        .map(([name, amt]) => ({
          name,
          amt: Number(amt || 0),
        }));
      if (list.length > 0) return list;
    }
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate);
        const list = normalizeArray(parsed);
        if (list.length > 0) return list;
      } catch (_) {
        const list = candidate
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name, amt: 0 }));
        if (list.length > 0) return list;
      }
    }
  }

  if (acceptedQuote?.addOnsIncluded && acceptedQuote?.addOns) {
    const list = Object.entries(acceptedQuote.addOnsIncluded)
      .filter(([, included]) => Boolean(included))
      .map(([name]) => ({
        name,
        amt: Number(acceptedQuote.addOns?.[name] || 0),
      }));
    if (list.length > 0) return list;
  }

  return [];
};

export const buildInsurancePaymentTimeline = (record) => {
  const safe = coerceInsuranceRecord(record);
  const premium = premiumNum(safe);
  const paymentLedger = (
    Array.isArray(safe.paymentHistory)
      ? safe.paymentHistory
      : Array.isArray(safe.payment_history)
        ? safe.payment_history
        : []
  ).map(normalizeInsuranceLedgerRow);
  const ledgerTotals = computeInsurancePaymentTotals(paymentLedger, premium);
  const sortedLedgerRows = sortLedgerByDate(paymentLedger);
  const latestRowBy = (predicate) =>
    [...sortedLedgerRows].reverse().find(predicate) || null;

  const latestInsurerRow = latestRowBy(
    (row) => row.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT,
  );
  const latestReceiptRow = latestRowBy(
    (row) => row.entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT,
  );
  const latestSubventionRefundRow = latestRowBy(
    (row) => row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND,
  );
  const latestSubventionNrRow = latestRowBy(
    (row) =>
      row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE,
  );

  const fallbackInsurerPaidByCustomer = Number(
    safe.customerPaymentToInsurer || safe.customer_payment_to_insurer || 0,
  );
  const fallbackAcPaidToInsurer = Number(
    safe.inhousePaymentReceived || safe.inhouse_payment_received || 0,
  );
  const effectiveInsurerPaidByCustomer =
    ledgerTotals.insurerPaidByCustomer || fallbackInsurerPaidByCustomer;
  const effectiveInsurerPaidByAc =
    ledgerTotals.insurerPaidByAutocredits ||
    Math.max(0, fallbackAcPaidToInsurer - fallbackInsurerPaidByCustomer);
  const effectiveInsurerPaidTotal =
    effectiveInsurerPaidByCustomer + effectiveInsurerPaidByAc;
  const effectiveInsurerMode =
    effectiveInsurerPaidByCustomer > 0 && effectiveInsurerPaidByAc === 0
      ? INSURER_SETTLEMENT_MODE.CUSTOMER
      : effectiveInsurerPaidByAc > 0 && effectiveInsurerPaidByCustomer === 0
        ? INSURER_SETTLEMENT_MODE.AUTOCREDITS
        : effectiveInsurerPaidByAc > 0 && effectiveInsurerPaidByCustomer > 0
          ? INSURER_SETTLEMENT_MODE.MIXED
          : INSURER_SETTLEMENT_MODE.NONE;

  const insurerFlowRow =
    effectiveInsurerPaidTotal > 0
      ? effectiveInsurerMode === INSURER_SETTLEMENT_MODE.CUSTOMER
        ? {
            label: "Customer paid insurer",
            amount: effectiveInsurerPaidByCustomer,
            type: "good",
            date: latestInsurerRow?.date || null,
          }
        : {
            label: "Autocredits paid insurer",
            amount: effectiveInsurerPaidByAc || effectiveInsurerPaidTotal,
            type: "good",
            date: latestInsurerRow?.date || null,
          }
      : {
          label: "Insurer payment pending",
          amount: Math.max(0, premium - effectiveInsurerPaidTotal),
          type: premium > 0 ? "warning" : "neutral",
          date: null,
        };

  const effectiveSubventionNr = ledgerTotals.subventionNotRecoverable;
  const effectiveSubventionRefund = Math.max(
    ledgerTotals.subventionRefundPaid,
    Number(safe.subventionAmount || 0),
  );
  const receiptVisible =
    effectiveInsurerMode === INSURER_SETTLEMENT_MODE.NONE ||
    effectiveInsurerMode === INSURER_SETTLEMENT_MODE.AUTOCREDITS;
  const insurerPaymentPending =
    effectiveInsurerPaidTotal <= 0 && premium > 0;
  const receiptBase = receiptVisible
    ? Math.max(0, premium - effectiveSubventionNr)
    : 0;
  const effectiveCustomerRecovered =
    ledgerTotals.customerRecovered ||
    Number(safe.customerPaymentReceived || 0);
  const customerOutstanding = receiptVisible
    ? Math.max(0, receiptBase - effectiveCustomerRecovered)
    : 0;

  const receiptFlowRow = receiptVisible
    ? effectiveCustomerRecovered > 0
      ? {
          label: "Receipt from customer",
          amount: effectiveCustomerRecovered,
          type: "good",
          date: latestReceiptRow?.date || null,
          progressBase: receiptBase,
        }
      : insurerPaymentPending
        ? null
        : {
            label: "Customer outstanding",
            amount: customerOutstanding,
            type: customerOutstanding > 0 ? "warning" : "neutral",
            date: null,
            progressBase: receiptBase,
          }
    : null;

  const subventionRows = [];
  if (effectiveSubventionNr > 0) {
    subventionRows.push({
      label: "Subvention (Non-recoverable)",
      amount: effectiveSubventionNr,
      type: "accent",
      date: latestSubventionNrRow?.date || null,
    });
  }
  if (effectiveSubventionRefund > 0 && effectiveSubventionRefund !== effectiveSubventionNr) {
    subventionRows.push({
      label: "Subvention Refund",
      amount: effectiveSubventionRefund,
      type: "accent",
      date: latestSubventionRefundRow?.date || null,
    });
  }

  return [
    {
      label: "Total Premium",
      amount: premium,
      type: "neutral",
      date: null,
    },
    insurerFlowRow,
    receiptFlowRow,
    ...subventionRows,
  ].filter(Boolean);
};

/** Nominee/reference contact from Step 1 — not source/dealer aliases. */
export const resolveInsuranceReference = (record) => {
  const r = coerceInsuranceRecord(record);
  const snap = coerceInsuranceRecord(r.customerSnapshot);
  const refFromSnap = extractReferenceFromCustomer(snap);
  const refFromRow = extractReferenceFromCustomer(r);

  return {
    referenceName: pickPolicyValue(
      r.referenceName,
      r.reference_name,
      refFromRow.referenceName,
      refFromSnap.referenceName,
    ),
    referencePhone: pickPolicyValue(
      r.referencePhone,
      r.referenceContactNumber,
      r.referenceMobile,
      r.referenceContact,
      refFromRow.referencePhone,
      refFromSnap.referencePhone,
    ),
  };
};

/** Re-export for dashboard — reference fields from customer-shaped rows */
export const extractReferenceFromCustomer = (raw = {}) => {
  const ref1 =
    raw.reference1 && typeof raw.reference1 === "object" ? raw.reference1 : {};
  const referenceName = String(
    ref1.name || raw.reference1_name || raw.referenceName || "",
  ).trim();
  const referencePhone = String(
    ref1.mobile || raw.reference1_mobile || raw.referencePhone || "",
  )
    .replace(/\D/g, "")
    .slice(0, 10);
  return { referenceName, referencePhone };
};

export const shouldShowInsuranceChannelBadge = (ctx = {}) => {
  const partner = String(ctx.channelPartnerName || "").trim();
  const channelNo = String(ctx.channelDealerNo || "").trim();
  if (!partner) return false;
  if (ctx.isIndirectSource) return Boolean(String(ctx.sourceDetailsName || "").trim());
  return Boolean(channelNo);
};

export const resolveInsuranceChannelContext = (record) => {
  const r = coerceInsuranceRecord(record);
  const sourceRaw = String(r.source || r.sourceOrigin || "").trim();
  const source =
    sourceRaw || (hasDisplayValue(r.sourceName) ? "Indirect" : "Direct");
  const isIndirectSource = source.toLowerCase() === "indirect";
  const policyDoneByRaw = String(r.policyDoneBy || r.policy_done_by || "").trim();
  const policyDoneByLower = policyDoneByRaw.toLowerCase();
  const brokerName = String(r.brokerName || "").trim();
  const showroomName = String(r.showroomName || "").trim();
  const dealerChannelName = String(r.dealerChannelName || "").trim();
  const channelDealerNo = pickPolicyValue(
    r.channelDealerNo,
    r.channel_dealer_no,
    r.channelDealerNumber,
    r.dealerChannelNumber,
    r.dealer_channel_number,
  );
  const channelPartnerName =
    policyDoneByLower === "broker"
      ? brokerName
      : policyDoneByLower === "showroom"
        ? showroomName
        : isIndirectSource
          ? dealerChannelName
          : "";

  return {
    source,
    isIndirectSource,
    policyDoneByLabel: policyDoneByRaw || "—",
    channelPartnerName,
    sourceDetailsName: isIndirectSource ? dealerChannelName : "",
    channelDealerNo,
  };
};

export const normalizeInsurerToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeUsedCarFlowLabel = (value) => {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return "";
  if (lower.includes("sale") || lower.includes("purchase"))
    return "Sale/Purchase";
  if (lower.includes("expired")) return "Policy Already Expired";
  if (lower.includes("rollover")) return "Rollover";
  if (lower.includes("renew")) return "Renewal";
  return raw;
};

export const getPolicyOriginType = (record = {}) => {
  const policyCategoryKey = String(
    record.policyCategory || record.policyTypeSelector || "",
  ).trim().toLowerCase();
  const isExtendedWarranty =
    policyCategoryKey === "extended warranty" ||
    policyCategoryKey === "ew policy";
  if (isExtendedWarranty) return "EW Policy";

  const vehicleType = String(record.vehicleType || "")
    .trim()
    .toLowerCase();
  const usedCarType = normalizeUsedCarFlowLabel(
    record.usedCarFlowType || record.usedCarFlow,
  );
  const persistedClassification = normalizeUsedCarFlowLabel(
    record.policyOriginType ||
    record.journeyClassification ||
    record.journeyType,
  );

  if (vehicleType === "used car") {
    if (usedCarType === "Renewal") {
      const previousInsurer = normalizeInsurerToken(
        record.previousInsuranceCompany,
      );
      const acceptedInsurer = normalizeInsurerToken(record.newInsuranceCompany);
      if (previousInsurer && acceptedInsurer) {
        return previousInsurer === acceptedInsurer ? "Renewal" : "Rollover";
      }
      return "Renewal";
    }
    if (
      usedCarType === "Policy Already Expired" ||
      usedCarType === "Sale/Purchase"
    ) {
      return usedCarType;
    }
    return persistedClassification || usedCarType || "Renewal";
  }

  return persistedClassification || usedCarType || "";
};

