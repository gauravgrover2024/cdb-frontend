import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Divider,
  Drawer,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Table,
  Typography,
  Tooltip,
} from "antd";
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  SwapOutlined,
  WalletOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  UnlockOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const PAYMENT_MODES = [
  "Online Transfer/UPI",
  "Cash",
  "Cheque",
  "DD",
  "Credit Card",
];

const ENTRY_TYPES = {
  INSURER_PAYMENT: "INSURER_PAYMENT",
  CUSTOMER_RECEIPT: "CUSTOMER_RECEIPT",
  SUBVENTION: "SUBVENTION",
  SUBVENTION_NON_RECOVERABLE: "SUBVENTION_NON_RECOVERABLE",
  SUBVENTION_REFUND: "SUBVENTION_REFUND",
};

const DEFAULT_PAYMENT_MODE = "Online Transfer/UPI";

const ENTRY_CONFIG = {
  [ENTRY_TYPES.INSURER_PAYMENT]: {
    label: "Payment to Insurance Co.",
    color: "#6366f1",
    bg: "#eef2ff",
    border: "#c7d2fe",
  },
  [ENTRY_TYPES.CUSTOMER_RECEIPT]: {
    label: "Receipt from Customer",
    color: "#10b981",
    bg: "#ecfdf5",
    border: "#a7f3d0",
  },
  [ENTRY_TYPES.SUBVENTION]: {
    label: "Subvention",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  [ENTRY_TYPES.SUBVENTION_REFUND]: {
    label: "Subvention Refund to Customer",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  [ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE]: {
    label: "Subvention (Not Recoverable)",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
};

const ENTRY_FORM_OPTIONS = [
  ENTRY_TYPES.INSURER_PAYMENT,
  ENTRY_TYPES.CUSTOMER_RECEIPT,
  ENTRY_TYPES.SUBVENTION,
];

const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const numberOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
const preserveUserAmount = (currentValue, suggestedValue) =>
  toAmount(currentValue) > 0 ? toAmount(currentValue) : suggestedValue;

const inferEntryType = (row = {}) => {
  if (row.entryType) return row.entryType;
  if (row.paymentType === "inhouse") return ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer") return ENTRY_TYPES.CUSTOMER_RECEIPT;
  if (row.paymentType === "subvention_nr")
    return ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
  return ENTRY_TYPES.INSURER_PAYMENT;
};

const normalizeLedgerRow = (row = {}, index = 0) => {
  const entryType = inferEntryType(row);
  const amount = toAmount(row.amount);
  const paidByRaw = String(row.paidBy || row.paymentBy || "").trim();
  let paidBy = paidByRaw;

  if (entryType === ENTRY_TYPES.INSURER_PAYMENT) {
    paidBy =
      paidByRaw ||
      (row.paymentType === "customer" ? "Customer" : "Autocredits");
  } else if (entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) {
    paidBy = "Customer";
  } else if (
    entryType === ENTRY_TYPES.SUBVENTION_REFUND ||
    entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
  ) {
    paidBy = "Autocredits";
  }

  return {
    _id: row._id || `pay-${Date.now()}-${index}`,
    entryType,
    paidBy,
    amount,
    date:
      row.date ??
      (entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
        ? null
        : dayjs().format("YYYY-MM-DD")),
    paymentMode:
      row.paymentMode ||
      (entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
        ? ""
        : DEFAULT_PAYMENT_MODE),
    transactionRef: row.transactionRef || "",
    bankName: row.bankName || "",
    remarks: row.remarks || "",
    recordedAt: row.recordedAt || new Date().toISOString(),
    paymentType:
      row.paymentType ||
      (entryType === ENTRY_TYPES.CUSTOMER_RECEIPT
        ? "customer"
        : entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
          ? "subvention_nr"
          : entryType === ENTRY_TYPES.INSURER_PAYMENT && paidBy !== "Customer"
            ? "inhouse"
            : "adjustment"),
  };
};

const computeTotals = (rows = [], premium = 0) => {
  const insurerPaidByAutocredits = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "autocredits",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidByCustomer = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "customer",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const customerRecovered = rows
    .filter((r) => r.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionNotRecoverable = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionRefundPaid = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_REFUND)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidTotal = insurerPaidByAutocredits + insurerPaidByCustomer;
  const insurerOutstanding = premium - insurerPaidTotal;
  const customerNetReceivableWhenAcPays = Math.max(
    0,
    insurerPaidByAutocredits - subventionNotRecoverable,
  );
  const customerOutstandingToAc =
    customerNetReceivableWhenAcPays - customerRecovered;
  const subventionRefundExpected = Math.max(0, premium - insurerPaidByCustomer);
  const subventionRefundOutstanding = Math.max(
    0,
    subventionRefundExpected - subventionRefundPaid,
  );
  const acNetExposure =
    insurerPaidByAutocredits + subventionRefundPaid - customerRecovered;

  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerNetReceivableWhenAcPays,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundExpected,
    subventionRefundPaid,
    subventionRefundOutstanding,
    acNetExposure,
  };
};

const ProgressBar = ({ value, total, color = "#6366f1" }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  sub,
  icon,
  accent = "#6366f1",
  accentBg = "#eef2ff",
  progress,
  progressTotal,
  tooltip,
}) => (
  <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div
      className="absolute right-0 top-0 h-20 w-20 rounded-bl-[60px] opacity-40"
      style={{ backgroundColor: accentBg }}
    />
    <div className="relative z-10 mb-3 flex items-start justify-between">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      {tooltip && (
        <Tooltip title={tooltip}>
          <InfoCircleOutlined className="cursor-help text-slate-300 hover:text-slate-500" />
        </Tooltip>
      )}
    </div>
    <div className="relative z-10">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      <div className="mt-0.5 text-2xl font-black tabular-nums text-slate-800">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] leading-tight text-slate-500">
          {sub}
        </div>
      ) : null}
      {progress !== undefined ? (
        <ProgressBar value={progress} total={progressTotal} color={accent} />
      ) : null}
    </div>
  </div>
);

const FlowIndicator = ({ label, settled }) => (
  <div
    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
      settled
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600"
    }`}
  >
    {settled ? <CheckCircleOutlined /> : <FieldTimeOutlined />}
    {label}
  </div>
);

const FormField = ({ label, children, required }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {label}
      {required ? <span className="ml-0.5 text-rose-400">*</span> : null}
    </label>
    {children}
  </div>
);
const Step7Payment = ({
  formData,
  setFormData,
  paymentForm,
  setPaymentForm,
  paymentHistory,
  setPaymentHistory,
  schedulePersist,
}) => {
  const didNormalizeInitialModeRef = useRef(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  const totalPremium = numberOrZero(formData.newTotalPremium);
  const isMobile = windowWidth < 1280;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const normalizedLedger = useMemo(
    () =>
      (Array.isArray(paymentHistory) ? paymentHistory : []).map(
        normalizeLedgerRow,
      ),
    [paymentHistory],
  );

  const ledgerSubventionNotRecoverableAmount = useMemo(
    () =>
      normalizedLedger
        .filter(
          (row) => row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE,
        )
        .reduce((sum, row) => sum + toAmount(row.amount), 0),
    [normalizedLedger],
  );

  const ledgerSubventionRefundAmount = useMemo(
    () =>
      normalizedLedger
        .filter((row) => row.entryType === ENTRY_TYPES.SUBVENTION_REFUND)
        .reduce((sum, row) => sum + toAmount(row.amount), 0),
    [normalizedLedger],
  );

  const totals = useMemo(
    () => computeTotals(normalizedLedger, totalPremium),
    [normalizedLedger, totalPremium],
  );

  const effectiveEntryTypeRaw =
    paymentForm?.entryType ||
    (paymentForm?.paymentType === "customer"
      ? ENTRY_TYPES.CUSTOMER_RECEIPT
      : ENTRY_TYPES.INSURER_PAYMENT);

  const effectiveEntryType =
    effectiveEntryTypeRaw === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE ||
    effectiveEntryTypeRaw === ENTRY_TYPES.SUBVENTION_REFUND
      ? ENTRY_TYPES.SUBVENTION
      : effectiveEntryTypeRaw;

  const effectivePaidBy =
    paymentForm?.paidBy ||
    (paymentForm?.paymentType === "customer" ? "Customer" : "Autocredits");

  const latestInsurerPaidBy = useMemo(() => {
    const latestInsurerRow = [...normalizedLedger]
      .reverse()
      .find((row) => row.entryType === ENTRY_TYPES.INSURER_PAYMENT);
    return latestInsurerRow?.paidBy || "";
  }, [normalizedLedger]);

  const inferredSubventionFlow =
    String(
      (effectiveEntryType === ENTRY_TYPES.INSURER_PAYMENT
        ? effectivePaidBy
        : latestInsurerPaidBy) || "Autocredits",
    ).toLowerCase() === "customer"
      ? "REFUND"
      : "NON_RECOVERABLE";

  const isSubventionEntry = effectiveEntryType === ENTRY_TYPES.SUBVENTION;
  const isSubventionNonTransactional =
    isSubventionEntry && inferredSubventionFlow === "NON_RECOVERABLE";

  const currentDraftInsurerCustomerAmount =
    effectiveEntryType === ENTRY_TYPES.INSURER_PAYMENT &&
    String(effectivePaidBy || "").toLowerCase() === "customer"
      ? toAmount(paymentForm?.amount)
      : 0;

  const currentDraftSubventionRefundAmount =
    isSubventionEntry && inferredSubventionFlow === "REFUND"
      ? toAmount(paymentForm?.amount)
      : 0;

  const currentDraftCustomerRecoveryAmount =
    effectiveEntryType === ENTRY_TYPES.CUSTOMER_RECEIPT
      ? toAmount(paymentForm?.amount)
      : 0;

  const totalCustomerInsurerAssumed =
    totals.insurerPaidByCustomer + currentDraftInsurerCustomerAmount;

  const totalSubventionRefundAssumed = Math.max(
    ledgerSubventionRefundAmount,
    currentDraftSubventionRefundAmount,
  );

  const suggestedInsurerAmountForCustomer = Math.max(
    0,
    totalPremium - totalSubventionRefundAssumed,
  );
  const suggestedInsurerAmountForAutocredits = totalPremium;

  const suggestedSubventionRefundAmount = Math.max(
    0,
    totalPremium - totalCustomerInsurerAssumed,
  );
  const totalCustomerRecoveryAssumed =
    totals.customerRecovered + currentDraftCustomerRecoveryAmount;
  const suggestedSubventionNonRecoverableAmount = Math.max(
    0,
    totals.insurerPaidByAutocredits - totalCustomerRecoveryAssumed,
  );

  const insurerSettled =
    totals.insurerOutstanding <= 0 && totals.insurerPaidTotal > 0;
  const customerSettled =
    totals.customerOutstandingToAc <= 0 && totals.customerRecovered > 0;
  const fullySettled = insurerSettled && customerSettled;

  useEffect(() => {
    if (fullySettled) setIsLocked(true);
  }, [fullySettled]);

  useEffect(() => {
    if (didNormalizeInitialModeRef.current) return;
    didNormalizeInitialModeRef.current = true;
    setPaymentForm((prev) => {
      if ((prev?.paymentMode || "") !== "Cash") return prev;
      return { ...prev, paymentMode: DEFAULT_PAYMENT_MODE };
    });
  }, [setPaymentForm]);

  useEffect(() => {
    setFormData((prev) => {
      const nextCustomerReceived = totals.customerRecovered;
      const nextInhouseReceived = totals.insurerPaidByAutocredits;
      const nextCustomerExpected = totals.customerNetReceivableWhenAcPays;
      const nextInhouseExpected = totalPremium;
      if (
        numberOrZero(prev.customerPaymentReceived) === nextCustomerReceived &&
        numberOrZero(prev.inhousePaymentReceived) === nextInhouseReceived &&
        numberOrZero(prev.customerPaymentExpected) === nextCustomerExpected &&
        numberOrZero(prev.inhousePaymentExpected) === nextInhouseExpected &&
        numberOrZero(prev.subventionAmount) ===
          ledgerSubventionNotRecoverableAmount
      ) {
        return prev;
      }
      return {
        ...prev,
        customerPaymentReceived: nextCustomerReceived,
        inhousePaymentReceived: nextInhouseReceived,
        customerPaymentExpected: nextCustomerExpected,
        inhousePaymentExpected: nextInhouseExpected,
        subventionAmount: ledgerSubventionNotRecoverableAmount,
      };
    });
  }, [ledgerSubventionNotRecoverableAmount, setFormData, totals, totalPremium]);

  useEffect(() => {
    if (effectiveEntryType !== ENTRY_TYPES.INSURER_PAYMENT) return;
    setPaymentForm((prev) => {
      if (toAmount(prev?.amount) > 0) return prev;
      const preferredMode = prev?.paymentMode || DEFAULT_PAYMENT_MODE;
      const suggestedAmount =
        String(prev?.paidBy || "").toLowerCase() === "customer"
          ? suggestedInsurerAmountForCustomer
          : suggestedInsurerAmountForAutocredits;
      if (
        preferredMode === prev?.paymentMode &&
        suggestedAmount === toAmount(prev?.amount)
      ) {
        return prev;
      }
      return { ...prev, paymentMode: preferredMode, amount: suggestedAmount };
    });
  }, [
    effectiveEntryType,
    setPaymentForm,
    suggestedInsurerAmountForAutocredits,
    suggestedInsurerAmountForCustomer,
  ]);

  useEffect(() => {
    if (!isSubventionEntry) return;
    setPaymentForm((prev) => {
      if (toAmount(prev?.amount) > 0) return prev;
      const nextAmount =
        inferredSubventionFlow === "REFUND"
          ? suggestedSubventionRefundAmount
          : suggestedSubventionNonRecoverableAmount;
      const nextMode =
        inferredSubventionFlow === "REFUND"
          ? prev?.paymentMode || DEFAULT_PAYMENT_MODE
          : "";
      const nextDate =
        inferredSubventionFlow === "REFUND"
          ? prev?.date || dayjs().format("YYYY-MM-DD")
          : null;
      const nextRef =
        inferredSubventionFlow === "REFUND" ? prev?.transactionRef || "" : "";
      if (
        toAmount(prev?.amount) === nextAmount &&
        (prev?.paymentMode || "") === nextMode &&
        (prev?.date || null) === nextDate &&
        (prev?.transactionRef || "") === nextRef
      ) {
        return prev;
      }
      return {
        ...prev,
        amount: nextAmount,
        paymentMode: nextMode,
        date: nextDate,
        transactionRef: nextRef,
      };
    });
  }, [
    inferredSubventionFlow,
    isSubventionEntry,
    setPaymentForm,
    suggestedSubventionNonRecoverableAmount,
    suggestedSubventionRefundAmount,
  ]);

  const settlementStatus =
    totals.insurerPaidByAutocredits > 0 && totals.insurerPaidByCustomer === 0
      ? "AC → Insurer"
      : totals.insurerPaidByCustomer > 0 &&
          totals.insurerPaidByAutocredits === 0
        ? "Customer → Insurer"
        : totals.insurerPaidByCustomer > 0 &&
            totals.insurerPaidByAutocredits > 0
          ? "Mixed Settlement"
          : null;

  const currentEntryProjectedType = isSubventionEntry
    ? inferredSubventionFlow === "REFUND"
      ? ENTRY_TYPES.SUBVENTION_REFUND
      : ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
    : effectiveEntryType;

  const validationMaxAllowed = useMemo(() => {
    if (currentEntryProjectedType === ENTRY_TYPES.INSURER_PAYMENT) {
      return Math.max(0, totals.insurerOutstanding);
    }
    if (currentEntryProjectedType === ENTRY_TYPES.CUSTOMER_RECEIPT) {
      return Math.max(0, totals.customerOutstandingToAc);
    }
    if (currentEntryProjectedType === ENTRY_TYPES.SUBVENTION_REFUND) {
      return Math.max(0, totals.subventionRefundOutstanding);
    }
    return Infinity;
  }, [currentEntryProjectedType, totals]);

  const showValidationBanner =
    Number.isFinite(validationMaxAllowed) &&
    validationMaxAllowed >= 0 &&
    toAmount(paymentForm?.amount) > validationMaxAllowed &&
    toAmount(paymentForm?.amount) > 0;

  const resetComposer = () => {
    setPaymentForm({
      amount: totalPremium > 0 ? totalPremium : 0,
      date: dayjs().format("YYYY-MM-DD"),
      entryType: ENTRY_TYPES.INSURER_PAYMENT,
      paidBy: "Autocredits",
      paymentType: "inhouse",
      paymentMode: DEFAULT_PAYMENT_MODE,
      transactionRef: "",
      remarks: "",
      bankName: "",
    });
  };

  const addLedgerEntry = () => {
    if (isLocked) {
      message.warning("Ledger is locked. Unlock it to add or change entries.");
      return;
    }

    const amount = toAmount(paymentForm?.amount);
    if (!amount) {
      message.error("Please enter a valid amount");
      return;
    }

    const entryType = currentEntryProjectedType;
    const paidBy =
      entryType === ENTRY_TYPES.CUSTOMER_RECEIPT
        ? "Customer"
        : entryType === ENTRY_TYPES.SUBVENTION_REFUND ||
            entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
          ? "Autocredits"
          : effectivePaidBy;

    const entry = normalizeLedgerRow(
      {
        _id: `ins-pay-${Date.now()}`,
        entryType,
        paidBy,
        amount,
        date:
          entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
            ? null
            : paymentForm?.date || dayjs().format("YYYY-MM-DD"),
        paymentMode:
          entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
            ? ""
            : paymentForm?.paymentMode || DEFAULT_PAYMENT_MODE,
        transactionRef:
          entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
            ? ""
            : paymentForm?.transactionRef || "",
        bankName: paymentForm?.bankName || "",
        remarks: paymentForm?.remarks || "",
      },
      normalizedLedger.length,
    );

    setPaymentHistory((prev) => [...(Array.isArray(prev) ? prev : []), entry]);
    resetComposer();
    setMobileComposerOpen(false);
    if (typeof schedulePersist === "function") schedulePersist(220);
    message.success("Ledger entry recorded");
  };

  const deleteLedgerEntry = (id) => {
    if (isLocked) {
      message.warning("Ledger is locked. Unlock it to delete entries.");
      return;
    }
    setPaymentHistory((prev) =>
      (Array.isArray(prev) ? prev : []).filter(
        (row) => String(row._id || "") !== String(id),
      ),
    );
    if (typeof schedulePersist === "function") schedulePersist(220);
    message.success("Entry removed");
  };

  const beginEditRow = (row) => {
    if (isLocked) {
      message.warning("Ledger is locked. Unlock it to edit entries.");
      return;
    }
    setEditingId(row._id);
    setEditDraft({
      ...row,
      amount: toAmount(row.amount),
      date: row.date,
      paymentMode: row.paymentMode || DEFAULT_PAYMENT_MODE,
      transactionRef: row.transactionRef || "",
      remarks: row.remarks || "",
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEditRow = (id) => {
    if (!editDraft || !toAmount(editDraft.amount)) {
      message.error("Please enter a valid amount before saving");
      return;
    }
    setPaymentHistory((prev) =>
      (Array.isArray(prev) ? prev : []).map((row) =>
        String(row._id || "") === String(id)
          ? {
              ...row,
              amount: toAmount(editDraft.amount),
              date: editDraft.date,
              paymentMode: editDraft.paymentMode,
              transactionRef: editDraft.transactionRef,
              remarks: editDraft.remarks,
            }
          : row,
      ),
    );
    if (typeof schedulePersist === "function") schedulePersist(220);
    message.success("Entry updated");
    cancelEditRow();
  };

  const tableRows = useMemo(
    () =>
      normalizedLedger.map((row, idx) => {
        const isCustomerInsurerPayment =
          row.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
          String(row.paidBy || "").toLowerCase() === "customer";

        let amountColor = "#f43f5e";
        let amountDirection = "up";
        let amountPrefix = "-";

        if (row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) {
          amountColor = "#10b981";
          amountDirection = "down";
          amountPrefix = "+";
        } else if (isCustomerInsurerPayment) {
          amountColor = "#2563eb";
          amountDirection = "neutral";
          amountPrefix = "";
        } else if (row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE) {
          amountColor = "#8b5cf6";
          amountDirection = "down";
          amountPrefix = "";
        } else if (row.entryType === ENTRY_TYPES.SUBVENTION_REFUND) {
          amountColor = "#f59e0b";
          amountDirection = "up";
          amountPrefix = "-";
        }

        return {
          key: row._id || idx,
          ...row,
          amountColor,
          amountDirection,
          amountPrefix,
          typeLabel:
            row.entryType === ENTRY_TYPES.INSURER_PAYMENT
              ? "Paid to Insurance Co."
              : row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT
                ? "Recovered from Customer"
                : row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
                  ? "Subvention (Not Recoverable)"
                  : "Subvention refund to Customer",
        };
      }),
    [normalizedLedger],
  );

  const subventionCardIsNR = totals.subventionNotRecoverable > 0;
  const subventionCardValue = subventionCardIsNR
    ? totals.subventionNotRecoverable
    : totals.subventionRefundPaid;
  const subventionCardSub = subventionCardIsNR
    ? `${INR(totals.subventionNotRecoverable)} amount adjusted`
    : `${INR(totals.subventionRefundPaid)} refunded to customer`;
  const subventionCardProgress = subventionCardValue;
  const subventionCardProgressTotal = subventionCardIsNR
    ? totals.subventionNotRecoverable || 1
    : totals.subventionRefundExpected || totals.subventionRefundPaid || 1;

  const renderComposer = () => (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <FormField label="Entry Type" required>
        <div className="grid grid-cols-1 gap-2">
          {ENTRY_FORM_OPTIONS.map((v) => {
            const cfg = ENTRY_CONFIG[v];
            const active = effectiveEntryType === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  if (v === ENTRY_TYPES.CUSTOMER_RECEIPT) {
                    setPaymentForm((p) => ({
                      ...p,
                      entryType: v,
                      paidBy: "Customer",
                      paymentType: "customer",
                      amount: preserveUserAmount(
                        p?.amount,
                        Math.max(
                          0,
                          totalPremium - totalSubventionRefundAssumed,
                        ),
                      ),
                      paymentMode: DEFAULT_PAYMENT_MODE,
                    }));
                  } else if (v === ENTRY_TYPES.SUBVENTION) {
                    setPaymentForm((p) => ({
                      ...p,
                      entryType: v,
                      paidBy: "Autocredits",
                      paymentType: "adjustment",
                      amount: preserveUserAmount(
                        p?.amount,
                        inferredSubventionFlow === "REFUND"
                          ? suggestedSubventionRefundAmount
                          : suggestedSubventionNonRecoverableAmount,
                      ),
                      paymentMode:
                        inferredSubventionFlow === "REFUND"
                          ? DEFAULT_PAYMENT_MODE
                          : "",
                      transactionRef:
                        inferredSubventionFlow === "REFUND"
                          ? p?.transactionRef || ""
                          : "",
                      date:
                        inferredSubventionFlow === "REFUND"
                          ? p?.date || dayjs().format("YYYY-MM-DD")
                          : null,
                      remarks:
                        p?.remarks || "Subvention recorded against premium",
                    }));
                  } else {
                    setPaymentForm((p) => ({
                      ...p,
                      entryType: v,
                      paidBy: "Autocredits",
                      paymentType: "inhouse",
                      paymentMode: DEFAULT_PAYMENT_MODE,
                      amount: preserveUserAmount(
                        p?.amount,
                        suggestedInsurerAmountForAutocredits,
                      ),
                    }));
                  }
                }}
                disabled={isLocked}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[12px] font-semibold transition-all ${
                  active
                    ? "shadow-sm"
                    : "border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200 hover:bg-white"
                } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                style={
                  active
                    ? {
                        borderColor: cfg.border,
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                      }
                    : {}
                }
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: active ? cfg.color : "#cbd5e1" }}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </FormField>

      {effectiveEntryType === ENTRY_TYPES.INSURER_PAYMENT ? (
        <FormField label="Paid By">
          <div className="grid grid-cols-2 gap-2">
            {["Autocredits", "Customer"].map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isLocked}
                onClick={() =>
                  setPaymentForm((p) => ({
                    ...p,
                    paidBy: opt,
                    paymentType: opt === "Customer" ? "customer" : "inhouse",
                    amount: preserveUserAmount(
                      p?.amount,
                      opt === "Customer"
                        ? suggestedInsurerAmountForCustomer
                        : suggestedInsurerAmountForAutocredits,
                    ),
                    paymentMode: DEFAULT_PAYMENT_MODE,
                  }))
                }
                className={`rounded-xl border py-2 text-[12px] font-semibold transition-all ${
                  effectivePaidBy === opt
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white"
                } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </FormField>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
          <InfoCircleOutlined className="mt-0.5 flex-shrink-0" />
          {effectiveEntryType === ENTRY_TYPES.CUSTOMER_RECEIPT
            ? "This will be recorded as a recovery: Customer → Autocredits."
            : inferredSubventionFlow === "REFUND"
              ? "Subvention is auto-set as refund flow (Customer paid insurer). Date/mode/ref required."
              : "Subvention is auto-set as non-recoverable flow (Autocredits paid insurer). Only amount + remarks required."}
        </div>
      )}

      <Divider className="!my-0" />

      <div
        className={`grid gap-3 ${isSubventionNonTransactional ? "grid-cols-1" : "grid-cols-2"}`}
      >
        <FormField label="Amount" required>
          <InputNumber
            min={0}
            value={paymentForm.amount}
            disabled={isLocked}
            onChange={(v) =>
              setPaymentForm((p) => ({ ...p, amount: numberOrZero(v) }))
            }
            style={{ width: "100%" }}
            prefix="₹"
            placeholder="0"
          />
        </FormField>
        {!isSubventionNonTransactional ? (
          <FormField label="Date">
            <Input
              type="date"
              disabled={isLocked}
              value={paymentForm.date || dayjs().format("YYYY-MM-DD")}
              onChange={(e) =>
                setPaymentForm((p) => ({ ...p, date: e.target.value }))
              }
            />
          </FormField>
        ) : null}
      </div>

      {!isSubventionNonTransactional ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Payment Mode">
            <Select
              value={paymentForm.paymentMode || DEFAULT_PAYMENT_MODE}
              disabled={isLocked}
              onChange={(v) =>
                setPaymentForm((p) => ({ ...p, paymentMode: v }))
              }
              options={PAYMENT_MODES.map((m) => ({ label: m, value: m }))}
              style={{ width: "100%" }}
            />
          </FormField>
          <FormField label="Ref / UTR">
            <Input
              value={paymentForm.transactionRef || ""}
              disabled={isLocked}
              onChange={(e) =>
                setPaymentForm((p) => ({
                  ...p,
                  transactionRef: e.target.value,
                }))
              }
              placeholder="UTR / Cheque No."
            />
          </FormField>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/70 px-3 py-2.5 text-[11px] text-violet-700">
          <InfoCircleOutlined className="mt-0.5 flex-shrink-0" />
          Non-recoverable subvention: only amount and remarks are required.
        </div>
      )}

      <FormField label="Remarks">
        <Input.TextArea
          rows={2}
          disabled={isLocked}
          value={paymentForm.remarks || ""}
          onChange={(e) =>
            setPaymentForm((p) => ({ ...p, remarks: e.target.value }))
          }
          placeholder="Optional note…"
          style={{ resize: "none" }}
        />
      </FormField>

      {showValidationBanner ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700">
          <ExclamationCircleOutlined className="mt-0.5 flex-shrink-0" />
          <div>
            Entered amount {INR(paymentForm?.amount)} exceeds suggested
            outstanding {INR(validationMaxAllowed)}. Entry will still be
            allowed, but please verify before saving.
          </div>
        </div>
      ) : null}

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={addLedgerEntry}
        disabled={isLocked}
        className="!mt-auto !h-10 !w-full !rounded-xl !border-0 !bg-indigo-600 !font-bold !text-white hover:!bg-indigo-700 disabled:!bg-slate-300"
      >
        Record Entry
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
        <div>
          <h2 className="m-0 text-[13px] font-black uppercase tracking-[0.18em] text-slate-700">
            Insurance Payment Workspace
          </h2>
          <p className="m-0 mt-0.5 text-[11px] text-slate-400">
            3-party settlement · Insurer · Customer · Autocredits
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settlementStatus ? <FlowIndicator label={settlementStatus} /> : null}
          <FlowIndicator label="Insurer settled" settled={insurerSettled} />
          <FlowIndicator label="Customer settled" settled={customerSettled} />
          <Button
            type="default"
            size="small"
            icon={isLocked ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => setIsLocked((prev) => !prev)}
            className={
              isLocked
                ? "!border-emerald-200 !text-emerald-700"
                : "!border-slate-200 !text-slate-600"
            }
          >
            {isLocked ? "Unlock ledger" : "Lock ledger"}
          </Button>
        </div>
      </div>

      {isLocked ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircleOutlined />
            Ledger is locked. Entries cannot be added, edited, or deleted until
            unlocked.
          </div>
          {fullySettled ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-emerald-700">
              Auto-locked after settlement
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Total Premium"
          value={INR(totalPremium)}
          sub="Payable to insurance company"
          icon={<BankOutlined style={{ fontSize: 16 }} />}
          accent="#6366f1"
          accentBg="#eef2ff"
          progress={totals.insurerPaidTotal}
          progressTotal={totalPremium}
          tooltip="The full premium amount that must be remitted to the insurer."
        />
        <MetricCard
          title="Insurer Outstanding"
          value={INR(Math.max(0, totals.insurerOutstanding))}
          sub={`${INR(totals.insurerPaidTotal)} paid of ${INR(totalPremium)}`}
          icon={<FieldTimeOutlined style={{ fontSize: 16 }} />}
          accent={totals.insurerOutstanding <= 0 ? "#10b981" : "#f43f5e"}
          accentBg={totals.insurerOutstanding <= 0 ? "#ecfdf5" : "#fff1f2"}
          progress={totals.insurerPaidTotal}
          progressTotal={totalPremium}
          tooltip="Remaining balance to be paid to the insurer."
        />
        <MetricCard
          title="Customer Outstanding"
          value={INR(Math.max(0, totals.customerOutstandingToAc))}
          sub={`${INR(totals.customerRecovered)} of ${INR(totals.customerNetReceivableWhenAcPays)} recovered`}
          icon={<WalletOutlined style={{ fontSize: 16 }} />}
          accent={totals.customerOutstandingToAc <= 0 ? "#10b981" : "#f59e0b"}
          accentBg={totals.customerOutstandingToAc <= 0 ? "#ecfdf5" : "#fffbeb"}
          progress={totals.customerRecovered}
          progressTotal={totals.customerNetReceivableWhenAcPays || 1}
          tooltip="Amount still to be recovered from customer after subvention."
        />
        <MetricCard
          title={subventionCardIsNR ? "Subvention (NR)" : "Subvention (Refund)"}
          value={INR(subventionCardValue)}
          sub={subventionCardSub}
          icon={<SwapOutlined style={{ fontSize: 16 }} />}
          accent="#8b5cf6"
          accentBg="#f5f3ff"
          progress={subventionCardProgress}
          progressTotal={subventionCardProgressTotal}
          tooltip={
            subventionCardIsNR
              ? "Subvention adjusted as non-recoverable."
              : "Subvention refunded to customer."
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        {!isMobile ? (
          <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="m-0 text-[12px] font-black uppercase tracking-[0.16em] text-slate-600">
                Add Ledger Entry
              </h3>
              <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                Record a transaction across any party
              </p>
            </div>
            {renderComposer()}
          </div>
        ) : null}

        <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="m-0 text-[12px] font-black uppercase tracking-[0.16em] text-slate-600">
                Payment Ledger
              </h3>
              <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                Net AC Exposure:{" "}
                <span
                  className={`font-bold ${totals.acNetExposure > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {INR(totals.acNetExposure)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                Insurer paid {INR(totals.insurerPaidTotal)}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                Recovered {INR(totals.customerRecovered)}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tableRows.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PlusOutlined style={{ fontSize: 20 }} />
                </div>
                <Text className="text-[13px] font-semibold text-slate-400">
                  No entries yet
                </Text>
                <Text className="text-[11px] text-slate-300">
                  Use Add Ledger Entry panel to add first entry
                </Text>
              </div>
            ) : (
              <Table
                size="small"
                pagination={false}
                dataSource={tableRows}
                scroll={{ x: 980 }}
                rowClassName="group"
                columns={[
                  {
                    title: "Date",
                    dataIndex: "date",
                    width: 120,
                    render: (d, row) =>
                      editingId === row._id ? (
                        <Input
                          type="date"
                          value={editDraft?.date || ""}
                          onChange={(e) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-[12px] text-slate-500">
                          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
                        </span>
                      ),
                  },
                  {
                    title: "Entry",
                    dataIndex: "typeLabel",
                    width: 220,
                    render: (_, row) => {
                      const cfg = ENTRY_CONFIG[row.entryType];
                      return (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: cfg?.color || "#94a3b8" }}
                          />
                          <div>
                            <div className="text-[12px] font-semibold text-slate-700">
                              {row.typeLabel}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              by {row.paidBy}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    title: "Amount",
                    dataIndex: "amount",
                    width: 140,
                    align: "right",
                    render: (v, row) =>
                      editingId === row._id ? (
                        <InputNumber
                          min={0}
                          value={editDraft?.amount}
                          onChange={(next) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              amount: numberOrZero(next),
                            }))
                          }
                          style={{ width: 120 }}
                          prefix="₹"
                        />
                      ) : (
                        <span
                          className="flex items-center justify-end gap-1 text-[13px] font-black tabular-nums"
                          style={{ color: row.amountColor }}
                        >
                          {row.amountDirection === "down" ? (
                            <ArrowDownOutlined style={{ fontSize: 10 }} />
                          ) : row.amountDirection === "neutral" ? (
                            <SwapOutlined style={{ fontSize: 10 }} />
                          ) : (
                            <ArrowUpOutlined style={{ fontSize: 10 }} />
                          )}
                          {row.amountPrefix}
                          {INR(Math.abs(v))}
                        </span>
                      ),
                  },
                  {
                    title: "Mode",
                    dataIndex: "paymentMode",
                    width: 140,
                    render: (v, row) =>
                      editingId === row._id ? (
                        <Select
                          value={editDraft?.paymentMode || DEFAULT_PAYMENT_MODE}
                          onChange={(next) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              paymentMode: next,
                            }))
                          }
                          options={PAYMENT_MODES.map((m) => ({
                            label: m,
                            value: m,
                          }))}
                          style={{ width: 130 }}
                        />
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {v || "—"}
                        </span>
                      ),
                  },
                  {
                    title: "Ref",
                    dataIndex: "transactionRef",
                    width: 150,
                    render: (v, row) =>
                      editingId === row._id ? (
                        <Input
                          value={editDraft?.transactionRef || ""}
                          onChange={(e) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              transactionRef: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">
                          {v || "—"}
                        </span>
                      ),
                  },
                  {
                    title: "Remarks",
                    dataIndex: "remarks",
                    render: (v, row) =>
                      editingId === row._id ? (
                        <Input
                          value={editDraft?.remarks || ""}
                          onChange={(e) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              remarks: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {v || "—"}
                        </span>
                      ),
                  },
                  {
                    title: "",
                    width: 110,
                    fixed: "right",
                    render: (_, row) =>
                      editingId === row._id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="text"
                            size="small"
                            icon={<SaveOutlined />}
                            aria-label="Save ledger entry"
                            className="!text-emerald-600"
                            onClick={() => saveEditRow(row._id)}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            aria-label="Cancel ledger edit"
                            className="!text-slate-500"
                            onClick={cancelEditRow}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            aria-label="Edit ledger entry"
                            className="!text-slate-400 hover:!text-indigo-500"
                            onClick={() => beginEditRow(row)}
                          />
                          <Popconfirm
                            title="Remove this entry?"
                            description="This action cannot be undone."
                            onConfirm={() => deleteLedgerEntry(row._id)}
                            okText="Remove"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancel"
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              aria-label="Delete ledger entry"
                              className="!text-slate-400 hover:!text-rose-500"
                            />
                          </Popconfirm>
                        </div>
                      ),
                  },
                ]}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl border-t border-slate-100 bg-slate-100 md:grid-cols-4">
            {[
              {
                label: "AC paid insurer",
                value: INR(totals.insurerPaidByAutocredits),
                accent: "#6366f1",
              },
              {
                label: "Recoverable after subvention",
                value: INR(totals.customerNetReceivableWhenAcPays),
                accent: "#10b981",
              },
              {
                label: "Subvention NR",
                value: INR(totals.subventionNotRecoverable),
                accent: "#f59e0b",
              },
              {
                label: "Subvention refund",
                value: INR(totals.subventionRefundPaid),
                accent: "#8b5cf6",
              },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 bg-white px-4 py-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </span>
                <span
                  className="text-[15px] font-black tabular-nums"
                  style={{ color: accent }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-5 py-2.5 text-[10px] leading-relaxed text-slate-400">
            <InfoCircleOutlined className="mr-1" />
            Subvention behavior is auto-driven by insurer payer: if insurer is
            paid by Autocredits, subvention is booked as non-recoverable; if
            insurer is paid by Customer, subvention is booked as
            refund-to-customer.
          </div>
        </div>
      </div>

      {isMobile ? (
        <>
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={() => setMobileComposerOpen(true)}
            className="!fixed !bottom-6 !right-6 !z-50 !flex !h-14 !w-14 !items-center !justify-center !border-0 !bg-indigo-600 !shadow-xl"
          />
          <Drawer
            title="Add Ledger Entry"
            placement="bottom"
            height="82vh"
            open={mobileComposerOpen}
            onClose={() => setMobileComposerOpen(false)}
            className="rounded-t-2xl"
          >
            {renderComposer()}
          </Drawer>
        </>
      ) : null}
    </div>
  );
};

export default Step7Payment;
