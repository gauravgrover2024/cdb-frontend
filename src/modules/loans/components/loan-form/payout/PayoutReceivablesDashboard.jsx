import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Tag,
  Select,
  Input,
  Button,
  Space,
  DatePicker,
  Modal,
  Form,
  message,
  Tooltip,
  Badge,
  InputNumber,
  Dropdown,
  Menu,
  Timeline,
  Progress,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  AlertOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  DownOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { loansApi } from "../../../../../api/loans";
import { paymentsApi } from "../../../../../api/payments";

const { Option } = Select;

/* ==============================
   Helpers
============================== */
const safeArray = (v) => (Array.isArray(v) ? v : []);

const normalizeDirection = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isLikelyReceivableFromLegacyRow = (row = {}) => {
  const direction = normalizeDirection(row?.payout_direction);
  if (direction) return direction === "receivable";

  const payoutId = String(row?.payoutId || row?.id || "")
    .trim()
    .toUpperCase();
  if (payoutId.startsWith("PR-")) return true;
  if (payoutId.startsWith("PP-")) return false;

  const payoutType = normalizeType(row?.payout_type);
  if (["bank", "insurance", "commission"].includes(payoutType)) return true;

  // Legacy fallback: if direction is not present, treat as receivable
  // in Collections dashboard to avoid hidden entries.
  return true;
};

const collectReceivableRows = (loan = {}) => {
  const strictKeys = ["loan_receivables", "loanReceivables", "receivables"];
  const legacyKeys = ["loan_payouts"];
  const rows = [];

  strictKeys.forEach((key) => {
    safeArray(loan?.[key]).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      rows.push({
        ...entry,
        __receivableSourceKey: key,
        __receivableSourceIndex: index,
      });
    });
  });

  legacyKeys.forEach((key) => {
    safeArray(loan?.[key]).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      if (!isLikelyReceivableFromLegacyRow(entry)) return;
      rows.push({
        ...entry,
        __receivableSourceKey: key,
        __receivableSourceIndex: index,
      });
    });
  });

  // De-dupe by payout id per loan while preserving first source priority.
  const seen = new Set();
  return rows.filter((entry) => {
    const key = String(entry?.payoutId || entry?.id || "")
      .trim()
      .toLowerCase();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getReceivablesKey = (loan) => {
  if (Object.prototype.hasOwnProperty.call(loan || {}, "loan_receivables")) {
    return "loan_receivables";
  }
  if (safeArray(loan?.loan_receivables).length > 0) return "loan_receivables";
  if (safeArray(loan?.loanReceivables).length > 0) return "loanReceivables";
  if (safeArray(loan?.receivables).length > 0) return "receivables";
  if (safeArray(loan?.loan_payouts).length > 0) return "loan_payouts";
  return "loan_receivables";
};

const getCustomerNameFromLoan = (loan) => {
  return (
    loan?.customerName ||
    loan?.profile_customerName ||
    loan?.profile_applicantName ||
    loan?.profile_applicant_name ||
    loan?.applicantName ||
    loan?.applicant_name ||
    loan?.leadName ||
    loan?.customer ||
    loan?.fullName ||
    loan?.name ||
    "-"
  );
};

const normalizeBankName = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;
const AUTO_COMMISSION_META_SOURCE = "payments_negative_balance_commission_auto";
const COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX = "collections_commission_receivable:";
const normalizePayoutId = (row = {}) =>
  String(row?.payoutId || row?.id || "").trim();

const stripReceivableRuntimeFields = (row = {}) => {
  const {
    __receivableSourceKey,
    __receivableSourceIndex,
    loanId,
    loanMongoId,
    customerName,
    ...rest
  } = row || {};
  return rest;
};

const firstValidDate = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const parsed = dayjs(value);
    if (parsed.isValid()) return parsed.toISOString();
  }
  return null;
};

const getCreatedDate = (record) =>
  record?.created_date ||
  record?.payout_createdAt ||
  record?.payout_created_date ||
  record?.createdAt ||
  null;

const parsePercent = (value) => {
  const cleaned = String(value ?? "")
    .replace("%", "")
    .trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const buildMissingBankReceivableFromDisbursedBank = (
  loan = {},
  existingRows = [],
) => {
  const hasBankReceivableAlready = safeArray(existingRows).some((row) => {
    const type = normalizeType(row?.payout_type);
    const direction = normalizeDirection(row?.payout_direction || "receivable");
    return type === "bank" && direction === "receivable";
  });
  if (hasBankReceivableAlready) return null;

  const disbursedBank = safeArray(loan?.approval_banksData).find((bank) => {
    const status = String(bank?.status || "")
      .trim()
      .toLowerCase();
    return status === "disbursed";
  });
  if (!disbursedBank) return null;

  const payoutPercent = parsePercent(disbursedBank?.payoutPercent);
  if (!(payoutPercent > 0)) return null;

  const disbursedAmount = Number(
    disbursedBank?.disbursedAmount || disbursedBank?.loanAmount || 0,
  );
  if (!(Number.isFinite(disbursedAmount) && disbursedAmount > 0)) return null;

  const payoutAmount = Number(
    ((disbursedAmount * payoutPercent) / 100).toFixed(2),
  );
  if (!(payoutAmount > 0)) return null;

  const tdsPercentage = 5;
  const tdsAmount = Number(((payoutAmount * tdsPercentage) / 100).toFixed(2));
  const payoutId = `PR-BANK-${String(loan?.loanId || loan?._id || "")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()}`;
  const createdAt = firstValidDate(
    disbursedBank?.disbursedDate,
    loan?.disbursement_date,
    loan?.approval_disbursedDate,
    loan?.updatedAt,
    loan?.createdAt,
  );

  return {
    id: payoutId,
    payoutId,
    payout_createdAt: createdAt,
    created_date: createdAt,
    payout_applicable: "Yes",
    payout_type: "Bank",
    payout_party_name:
      disbursedBank?.bankName ||
      loan?.disburse_bankName ||
      loan?.approval_bankName ||
      "Bank",
    payout_percentage: String(disbursedBank?.payoutPercent || payoutPercent),
    payout_amount: payoutAmount,
    payout_direction: "Receivable",
    tds_applicable: "Yes",
    tds_percentage: tdsPercentage,
    tds_amount: tdsAmount,
    net_payout_amount: Number((payoutAmount - tdsAmount).toFixed(2)),
    payout_status: "Expected",
    payout_expected_date: null,
    payout_received_date: null,
    payment_history: [],
    activity_log: [],
    payout_remarks: "Auto-generated from disbursed bank payoutPercent.",
    meta_source: "loan_disbursed_bank_payout_percent",
    __receivableSourceKey: "loan_receivables",
    __receivableSourceIndex: -1,
  };
};

const resolvePaymentDocFromResponse = (response) => {
  if (!response) return null;
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response;
};

const buildCommissionRowsForShowroomPayments = ({
  payoutId,
  partyName,
  paymentHistory,
}) => {
  const autoKey = `${COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX}${payoutId}`;
  return safeArray(paymentHistory)
    .map((payment, index) => {
      const amount = Number(payment?.amount || 0);
      if (!(amount > 0)) return null;
      const paymentDateIso = firstValidDate(payment?.date, payment?.timestamp);
      return {
        id: `COLL-COMM-${String(payoutId || "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase()}-${index + 1}`,
        paymentType: "Commission",
        paymentMadeBy: "Showroom",
        paymentMode: "Collections Dashboard",
        paymentAmount: String(amount),
        paymentDate: paymentDateIso,
        transactionDetails: "",
        bankName: String(partyName || "").trim(),
        remarks:
          String(payment?.remarks || "").trim() ||
          `Auto from Collections (${payoutId})`,
        adjustmentDirection: null,
        crossCaseId: null,
        crossCaseLabel: "",
        _auto: true,
        _autoKey: autoKey,
      };
    })
    .filter(Boolean);
};

const getExpectedAmount = (record) => {
  const net = Number(record?.net_payout_amount);
  if (Number.isFinite(net) && net > 0) return net;
  return Number(record?.payout_amount || 0) - Number(record?.tds_amount || 0);
};

const calculateDaysPending = (receivedDate, createdDate) => {
  if (receivedDate) return null;
  const start = createdDate ? dayjs(createdDate) : dayjs();
  const today = dayjs();
  return today.diff(start, "day");
};

const addActivityLog = (existingLog, action, details) => {
  const log = safeArray(existingLog);
  return [
    ...log,
    {
      timestamp: new Date().toISOString(),
      action,
      details,
      date: dayjs().format("DD MMM YYYY, hh:mm A"),
    },
  ];
};

const toUiStatus = (rawStatus, paymentStatus) => {
  if (paymentStatus.isFullyPaid) return "Received";
  if (paymentStatus.isPartial) return "Partial";
  if (rawStatus === "Received") return "Received";
  return "Pending";
};

const toBackendStatus = (uiStatus) => {
  if (uiStatus === "Received") return "Received";
  if (uiStatus === "Partial") return "Partial";
  return "Expected";
};

const getPaymentStatus = (record) => {
  const expectedAmount = getExpectedAmount(record);
  const paymentHistory = safeArray(record?.payment_history);
  const totalReceived = paymentHistory.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  return {
    expectedAmount,
    totalReceived,
    pendingAmount: Math.max(0, expectedAmount - totalReceived),
    percentageReceived:
      expectedAmount > 0 ? (totalReceived / expectedAmount) * 100 : 0,
    isPartial: totalReceived > 0 && totalReceived < expectedAmount,
    isFullyPaid: totalReceived >= expectedAmount && totalReceived > 0,
  };
};

/* ==============================
   Component
============================== */
const PayoutReceivablesDashboard = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [bankFilter, setBankFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [ageFilter, setAgeFilter] = useState("All");
  const [amountRangeFilter, setAmountRangeFilter] = useState("All");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const [bulkCollectionModalVisible, setBulkCollectionModalVisible] =
    useState(false);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] =
    useState(false);
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false);
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] =
    useState(false);

  const [currentRecord, setCurrentRecord] = useState(null);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);

  const [bulkForm] = Form.useForm();
  const [partialPaymentForm] = Form.useForm();
  const [editPaymentForm] = Form.useForm();

  const syncAutoCommissionReceivableIntoPayments = async ({
    loanId,
    receivableRow,
  }) => {
    if (!loanId || !receivableRow) return;
    if (
      String(receivableRow?.meta_source || "").trim() !== AUTO_COMMISSION_META_SOURCE
    ) {
      return;
    }
    const payoutId = String(receivableRow?.payoutId || receivableRow?.id || "").trim();
    if (!payoutId) return;

    const paymentResponse = await paymentsApi.getByLoanId(loanId);
    const paymentDoc = resolvePaymentDocFromResponse(paymentResponse) || {};
    const showroomRows = safeArray(paymentDoc?.showroomRows);
    const autoKey = `${COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX}${payoutId}`;
    const keptRows = showroomRows.filter(
      (row) => String(row?._autoKey || "").trim() !== autoKey,
    );
    const generatedRows = buildCommissionRowsForShowroomPayments({
      payoutId,
      partyName: receivableRow?.payout_party_name,
      paymentHistory: safeArray(receivableRow?.payment_history),
    });

    const nextRows = [...keptRows, ...generatedRows];
    const previousSerialized = JSON.stringify(showroomRows);
    const nextSerialized = JSON.stringify(nextRows);
    if (previousSerialized === nextSerialized) return;

    await paymentsApi.update(loanId, { showroomRows: nextRows });
  };

  const syncAutoCommissionFromServerRow = async ({ loanRef, payoutId }) => {
    if (!loanRef || !payoutId) return;
    const loanRes = await loansApi.getById(loanRef);
    const loanDoc = loanRes?.data || null;
    if (!loanDoc) return;
    const row = collectReceivableRows(loanDoc).find(
      (entry) => String(entry?.payoutId || entry?.id || "") === String(payoutId),
    );
    if (!row) return;
    await syncAutoCommissionReceivableIntoPayments({
      loanId: loanDoc?.loanId || loanRef,
      receivableRow: row,
    });
  };

  const loadReceivables = async () => {
    try {
      let allLoans = [];
      let usedFastCollectionsEndpoint = false;
      try {
        const fastRes = await loansApi.getCollectionsReceivables({
          limit: 12000,
          skip: 0,
        });
        const fastRows = safeArray(fastRes?.data);
        if (fastRows.length > 0 || Number(fastRes?.total || 0) === 0) {
          allLoans = fastRows;
          usedFastCollectionsEndpoint = true;
        }
      } catch (_) {
        // Graceful fallback for older backend deployments that don't have
        // /api/loans/collections/receivables yet.
      }

      if (!usedFastCollectionsEndpoint) {
        const pageSize = 300;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
          const res = await loansApi.getAll({
            limit: pageSize,
            skip,
            noCount: true,
            sortBy: "leadDate",
            sortDir: "desc",
          });
          const pageLoans = safeArray(res?.data);
          allLoans.push(...pageLoans);
          hasMore = Boolean(res?.hasMore);
          skip += pageSize;
        }
      }

      const receivables = allLoans.flatMap((loan) => {
        const receivableList = collectReceivableRows(loan);
        const derivedBankReceivable = buildMissingBankReceivableFromDisbursedBank(
          loan,
          receivableList,
        );
        const mergedRows = derivedBankReceivable
          ? [...receivableList, derivedBankReceivable]
          : receivableList;

        return mergedRows.map((p) => ({
          ...p,
          payoutId: p?.payoutId || p?.id,
          id: p?.id || p?.payoutId,
          loanId: loan.loanId || loan.id || "-",
          loanMongoId: loan._id || loan.id,
          customerName: getCustomerNameFromLoan(loan),
          payment_history: safeArray(p.payment_history),
          activity_log: safeArray(p.activity_log),
          created_date:
            String(p?.meta_source || "").trim() ===
            AUTO_COMMISSION_META_SOURCE
              ? firstValidDate(
                  loan?.delivery_date,
                  loan?.deliveryDate,
                  loan?.vehicleDeliveryDate,
                  loan?.approval_disbursedDate,
                  getCreatedDate(p),
                )
              : getCreatedDate(p),
        }));
      });

      setLoans(allLoans);
      setRows(receivables);
    } catch (err) {
      console.error("Failed to load receivables:", err);
      messageApi.error("Failed to load receivables");
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  const updateReceivableInBackend = async (
    payoutId,
    patch,
    activityAction = null,
    options = {},
  ) => {
    const shouldReload = options?.reload !== false;
    const normalizedPayoutId = String(payoutId || "").trim();
    if (!normalizedPayoutId) return;

    const sourceLoans = Array.isArray(loans) ? loans : [];
    const sourceMatch = rows.find(
      (row) => normalizePayoutId(row) === normalizedPayoutId,
    );

    const matchLoanRef = String(
      sourceMatch?.loanMongoId || sourceMatch?.loanId || "",
    ).trim();

    let targetLoan =
      sourceLoans.find((loan) => {
        const loanMongoId = String(loan?._id || "").trim();
        const loanBizId = String(loan?.loanId || "").trim();
        return (
          (matchLoanRef && loanMongoId && matchLoanRef === loanMongoId) ||
          (matchLoanRef && loanBizId && matchLoanRef === loanBizId)
        );
      }) || null;

    if (!targetLoan) {
      targetLoan = sourceLoans.find((loan) =>
        collectReceivableRows(loan).some(
          (entry) => normalizePayoutId(entry) === normalizedPayoutId,
        ),
      );
    }
    if (!targetLoan) return;

    const preferredKey = sourceMatch?.__receivableSourceKey;
    const key = preferredKey || getReceivablesKey(targetLoan);
    const list = safeArray(targetLoan[key]);
    const existingIndex = list.findIndex(
      (entry) => normalizePayoutId(entry) === normalizedPayoutId,
    );

    let updatedList = list;
    if (existingIndex >= 0) {
      updatedList = list.map((entry, idx) => {
        if (idx !== existingIndex) return entry;
        const updated = { ...entry, ...patch };
        if (activityAction) {
          updated.activity_log = addActivityLog(
            entry.activity_log,
            activityAction.action,
            activityAction.details,
          );
        }
        return updated;
      });
    } else if (sourceMatch) {
      const seedRow = stripReceivableRuntimeFields(sourceMatch);
      const created = {
        ...seedRow,
        id: seedRow?.id || normalizedPayoutId,
        payoutId: seedRow?.payoutId || normalizedPayoutId,
        payment_history: safeArray(seedRow?.payment_history),
        activity_log: safeArray(seedRow?.activity_log),
        ...patch,
      };
      if (activityAction) {
        created.activity_log = addActivityLog(
          created.activity_log,
          activityAction.action,
          activityAction.details,
        );
      }
      updatedList = [...list, created];
    } else {
      return;
    }

    try {
      await loansApi.update(
        targetLoan._id || targetLoan.loanId || targetLoan.id,
        {
          [key]: updatedList,
        },
      );
      const updatedRow = safeArray(updatedList).find(
        (row) => String(row?.payoutId || row?.id || "") === String(payoutId),
      );
      if (updatedRow) {
        await syncAutoCommissionReceivableIntoPayments({
          loanId: targetLoan?.loanId || targetLoan?._id,
          receivableRow: updatedRow,
        });
      }
      if (shouldReload) {
        await loadReceivables();
      }
    } catch (err) {
      console.error("Failed to update receivable:", err);
      messageApi.error("Failed to update receivable");
    }
  };

  /* ==============================
     Stats & Bank Summary
  ============================== */
  const bankOptions = useMemo(() => {
    const banks = Array.from(
      new Set(
        rows
          .map((r) => r.payout_party_name)
          .filter(Boolean)
          .map((b) => String(b).trim()),
      ),
    );
    return banks.sort();
  }, [rows]);

  const bankSummary = useMemo(() => {
    const summary = {};
    rows.forEach((r) => {
      const bank = r.payout_party_name || "Unknown";
      if (!summary[bank]) {
        summary[bank] = { total: 0, count: 0, pending: 0, collected: 0 };
      }

      const paymentStatus = getPaymentStatus(r);
      summary[bank].total += paymentStatus.expectedAmount;
      summary[bank].count += 1;
      summary[bank].collected += paymentStatus.totalReceived;
      summary[bank].pending += paymentStatus.pendingAmount;
    });

    return Object.entries(summary)
      .map(([bank, data]) => ({ bank, ...data }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  const stats = useMemo(() => {
    let totalAmount = 0;
    let collectedAmount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    rows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      totalAmount += paymentStatus.expectedAmount;
      collectedAmount += paymentStatus.totalReceived;

      if (!paymentStatus.isFullyPaid) {
        pendingAmount += paymentStatus.pendingAmount;
        pendingCount += 1;

        const days = calculateDaysPending(
          r.payout_received_date,
          r.created_date,
        );
        if (days !== null && days > 15) {
          overdueCount += 1;
        }
      }
    });

    return [
      {
        id: "total",
        label: "Total Receivables",
        value: formatCurrency(totalAmount),
        icon: <DollarOutlined />,
      },
      {
        id: "collected",
        label: "Collected",
        value: formatCurrency(collectedAmount),
        icon: <CheckCircleOutlined />,
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCurrency(pendingAmount),
        subtext: `${pendingCount} items`,
        icon: <ClockCircleOutlined />,
      },
      {
        id: "overdue",
        label: "Overdue (15+ days)",
        value: overdueCount,
        icon: <AlertOutlined />,
      },
    ];
  }, [rows]);

  /* ==============================
     Filtering
  ============================== */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const paymentStatus = getPaymentStatus(r);
      const uiStatus = toUiStatus(r.payout_status, paymentStatus);

      const statusOk =
        statusFilter === "All" ? true : uiStatus === statusFilter;

      const bankOk =
        bankFilter === "All"
          ? true
          : normalizeBankName(r.payout_party_name) ===
            normalizeBankName(bankFilter);

      const searchOk = searchText
        ? `${r.loanId} ${r.customerName} ${r.payout_party_name} ${r.payoutId}`
            .toLowerCase()
            .includes(searchText.toLowerCase())
        : true;

      let ageOk = true;
      if (ageFilter !== "All") {
        if (!paymentStatus.isFullyPaid) {
          const days = calculateDaysPending(
            r.payout_received_date,
            r.created_date,
          );
          if (days !== null) {
            if (ageFilter === "0-7") ageOk = days <= 7;
            else if (ageFilter === "8-15") ageOk = days >= 8 && days <= 15;
            else if (ageFilter === "16-30") ageOk = days >= 16 && days <= 30;
            else if (ageFilter === "30+") ageOk = days > 30;
          }
        }
      }

      let amountOk = true;
      if (amountRangeFilter !== "All") {
        const amount = Number(r.payout_amount || 0);
        if (amountRangeFilter === "0-50k") amountOk = amount <= 50000;
        else if (amountRangeFilter === "50k-1L")
          amountOk = amount > 50000 && amount <= 100000;
        else if (amountRangeFilter === "1L-5L")
          amountOk = amount > 100000 && amount <= 500000;
        else if (amountRangeFilter === "5L+") amountOk = amount > 500000;
      }

      return statusOk && bankOk && searchOk && ageOk && amountOk;
    });
  }, [
    rows,
    statusFilter,
    bankFilter,
    searchText,
    ageFilter,
    amountRangeFilter,
  ]);

  const filteredSubtotals = useMemo(() => {
    const totals = {
      expected: 0,
      received: 0,
      pending: 0,
      parties: new Set(),
    };
    filteredRows.forEach((row) => {
      const paymentStatus = getPaymentStatus(row);
      totals.expected += paymentStatus.expectedAmount;
      totals.received += paymentStatus.totalReceived;
      totals.pending += paymentStatus.pendingAmount;
      const party = String(row?.payout_party_name || "")
        .trim()
        .toLowerCase();
      if (party) totals.parties.add(party);
    });
    return {
      expected: totals.expected,
      received: totals.received,
      pending: totals.pending,
      partyCount: totals.parties.size,
      rowCount: filteredRows.length,
    };
  }, [filteredRows]);

  /* ==============================
     Payment History Management
  ============================== */
  const openPaymentHistoryModal = (record) => {
    setCurrentRecord(record);
    setPaymentHistoryModalVisible(true);
  };

  const handleEditPayment = (payment, index) => {
    setEditingPaymentIndex(index);
    editPaymentForm.setFieldsValue({
      payment_amount: payment.amount,
      payment_date: dayjs(payment.date),
      payment_remarks: payment.remarks || "",
    });
    setEditPaymentModalVisible(true);
  };

  const handleEditPaymentSave = async () => {
    const values = await editPaymentForm.validateFields();
    const updatedHistory = [...safeArray(currentRecord.payment_history)];
    updatedHistory[editingPaymentIndex] = {
      ...updatedHistory[editingPaymentIndex],
      amount: values.payment_amount,
      date: values.payment_date.format("YYYY-MM-DD"),
      remarks: values.payment_remarks || "",
      edited_at: new Date().toISOString(),
    };

    const totalReceived = updatedHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(
          isFullyPaid ? "Received" : totalReceived > 0 ? "Partial" : "Pending",
        ),
        payout_received_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_received_date,
      },
      {
        action: "Payment Edited",
        details: `Updated payment: ${formatCurrency(values.payment_amount)} on ${values.payment_date.format("DD MMM YYYY")}`,
      },
    );

    setEditPaymentModalVisible(false);
    messageApi.success("Payment updated successfully");
  };

  const handleDeletePayment = async (index) => {
    const updatedHistory = [...safeArray(currentRecord.payment_history)];
    const deletedPayment = updatedHistory[index];
    updatedHistory.splice(index, 1);

    const totalReceived = updatedHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(
          isFullyPaid ? "Received" : totalReceived > 0 ? "Partial" : "Pending",
        ),
        payout_received_date: isFullyPaid
          ? currentRecord.payout_received_date
          : "",
      },
      {
        action: "Payment Deleted",
        details: `Deleted payment: ${formatCurrency(deletedPayment.amount)} dated ${dayjs(deletedPayment.date).format("DD MMM YYYY")}`,
      },
    );

    messageApi.success("Payment deleted successfully");
  };

  /* ==============================
     Bulk Collection with Individual Amounts
  ============================== */
  const openBulkCollectionModal = () => {
    if (!selectedRows.length) {
      messageApi.warning("Please select at least 1 receivable");
      return;
    }

    const initialValues = {
      received_date: dayjs(),
    };

    selectedRows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      initialValues[`amount_${normalizePayoutId(r)}`] = paymentStatus.pendingAmount;
    });

    bulkForm.setFieldsValue(initialValues);
    setBulkCollectionModalVisible(true);
  };

  const handleBulkCollectionSave = async () => {
    const values = await bulkForm.validateFields();
    const receivedDate = values.received_date.format("YYYY-MM-DD");
    let updatedCount = 0;
    for (const row of selectedRows) {
      const rowId = normalizePayoutId(row);
      const amountReceived = Number(values[`amount_${rowId}`] || 0);
      if (amountReceived <= 0) continue;

      const existingHistory = safeArray(row.payment_history);
      const newHistory = [
        ...existingHistory,
        {
          amount: amountReceived,
          date: receivedDate,
          remarks: "Bulk collection",
          timestamp: new Date().toISOString(),
        },
      ];
      const totalReceived = newHistory.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
      const expectedAmount = getExpectedAmount(row);
      const isFullyPaid = totalReceived >= expectedAmount;

      await updateReceivableInBackend(
        rowId,
        {
          payment_history: newHistory,
          payout_status: toBackendStatus(isFullyPaid ? "Received" : "Partial"),
          payout_received_date: isFullyPaid
            ? receivedDate
            : row.payout_received_date,
        },
        {
          action: isFullyPaid
            ? "Full Payment Received"
            : "Partial Payment Recorded",
          details: `Received ${formatCurrency(amountReceived)} on ${receivedDate}. Total: ${formatCurrency(totalReceived)} of ${formatCurrency(expectedAmount)}`,
        },
        { reload: false },
      );
      updatedCount += 1;
    }

    const autoSyncTargets = Array.from(
      new Set(
        selectedRows
          .filter(
            (row) =>
              String(row?.meta_source || "").trim() ===
              AUTO_COMMISSION_META_SOURCE,
          )
          .map(
            (row) =>
              `${String(row?.loanMongoId || row?.loanId || "")}::${normalizePayoutId(row)}`,
          ),
      ),
    );
    await Promise.all(
      autoSyncTargets.map((target) => {
        const [loanRef, payoutId] = String(target).split("::");
        if (!loanRef || !payoutId) return Promise.resolve();
        return syncAutoCommissionFromServerRow({ loanRef, payoutId }).catch(
          () => {},
        );
      }),
    );

    await loadReceivables();
    setSelectedRowKeys([]);
    setSelectedRows([]);
    setBulkCollectionModalVisible(false);
    messageApi.success(`${updatedCount} receivables updated`);
  };

  /* ==============================
     Single Partial Payment
  ============================== */
  const openPartialPaymentModal = (record) => {
    setCurrentRecord(record);
    const paymentStatus = getPaymentStatus(record);

    partialPaymentForm.setFieldsValue({
      payment_amount: paymentStatus.pendingAmount,
      payment_date: dayjs(),
    });

    setPartialPaymentModalVisible(true);
  };

  const handlePartialPaymentSave = async () => {
    const values = await partialPaymentForm.validateFields();
    const payment = {
      amount: values.payment_amount,
      date: values.payment_date.format("YYYY-MM-DD"),
      remarks: values.payment_remarks || "",
      timestamp: new Date().toISOString(),
    };

    const existingHistory = safeArray(currentRecord.payment_history);
    const newHistory = [...existingHistory, payment];

    const totalReceived = newHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: newHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Received" : "Partial"),
        payout_received_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_received_date,
      },
      {
        action: isFullyPaid
          ? "Full Payment Received"
          : "Partial Payment Recorded",
        details: `Received ${formatCurrency(payment.amount)} on ${payment.date}. Total: ${formatCurrency(totalReceived)} of ${formatCurrency(expectedAmount)}`,
      },
    );

    setPartialPaymentModalVisible(false);
    messageApi.success(
      isFullyPaid
        ? "Payment complete!"
        : "Partial payment recorded successfully",
    );
  };

  const openTimelineModal = (record) => {
    setCurrentRecord(record);
    setTimelineModalVisible(true);
  };

  const handleExport = () => {
    if (!filteredRows.length) {
      messageApi.warning("No rows to export");
      return;
    }

    const exportData = filteredRows.map((r) => {
      const paymentStatus = getPaymentStatus(r);
      return {
        "Payout ID": r.payoutId,
        "Loan ID": r.loanId,
        "Customer Name": r.customerName,
        "Bank/Party": r.payout_party_name,
        Type: r.payout_type,
        "Expected Amount": paymentStatus.expectedAmount,
        "Amount Received": paymentStatus.totalReceived,
        "Pending Amount": paymentStatus.pendingAmount,
        Status: toUiStatus(r.payout_status, paymentStatus),
        "Days Pending":
          calculateDaysPending(r.payout_received_date, r.created_date) || "-",
        "Received Date": r.payout_received_date || "-",
      };
    });

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Collections_${dayjs().format("YYYY-MM-DD")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    messageApi.success("Data exported to CSV successfully");
  };

  /* ==============================
     Columns
  ============================== */
  const columns = [
    {
      title: "Loan Details",
      width: 240,
      fixed: "left",
      render: (_, r) => {
        const paymentStatus = getPaymentStatus(r);

        return (
          <div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {r.customerName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Loan: {r.loanId}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              ID: {r.payoutId}
            </div>
            {paymentStatus.isPartial && (
              <div className="mt-2">
                <Progress
                  percent={Math.round(paymentStatus.percentageReceived)}
                  size="small"
                  strokeColor="#faad14"
                  format={() =>
                    `${Math.round(paymentStatus.percentageReceived)}%`
                  }
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Bank / Party",
      dataIndex: "payout_party_name",
      width: 180,
      render: (v, r) => (
        <div>
          <div className="font-medium text-sm">{v}</div>
          <Tag style={{ marginTop: 4, fontSize: 11 }}>{r.payout_type}</Tag>
        </div>
      ),
    },
    {
      title: "Amount",
      width: 200,
      align: "right",
      render: (_, r) => {
        const paymentStatus = getPaymentStatus(r);

        return (
          <div>
            <div className="text-base font-semibold">
              {formatCurrency(paymentStatus.expectedAmount)}
            </div>
            {Number(r.tds_amount || 0) > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                TDS: {formatCurrency(r.tds_amount)}
              </div>
            )}
            {paymentStatus.isPartial && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">
                  ✓ Received: {formatCurrency(paymentStatus.totalReceived)}
                </div>
                <div className="text-xs text-orange-600 font-medium">
                  ⏳ Pending: {formatCurrency(paymentStatus.pendingAmount)}
                </div>
              </div>
            )}
            {paymentStatus.isFullyPaid && (
              <div className="text-xs text-green-600 mt-1">
                ✓ Fully Collected
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Aging",
      width: 100,
      align: "center",
      render: (_, r) => {
        const paymentStatus = getPaymentStatus(r);

        if (paymentStatus.isFullyPaid) {
          return <Tag color="success">Collected</Tag>;
        }

        const days = calculateDaysPending(
          r.payout_received_date,
          r.created_date,
        );
        if (days === null) return "-";

        let color = "default";
        let icon = null;
        if (days <= 7) color = "blue";
        else if (days <= 15) color = "orange";
        else {
          color = "red";
          icon = <WarningOutlined />;
        }

        return (
          <Tag color={color} icon={icon}>
            {days} days
          </Tag>
        );
      },
    },
    {
      title: "Status",
      width: 120,
      align: "center",
      render: (_, r) => {
        const paymentStatus = getPaymentStatus(r);

        let status = "Pending";
        let color = "default";
        let icon = <ClockCircleOutlined />;

        if (paymentStatus.isFullyPaid) {
          status = "Received";
          color = "success";
          icon = <CheckCircleOutlined />;
        } else if (paymentStatus.isPartial) {
          status = "Partial";
          color = "warning";
          icon = <ClockCircleOutlined />;
        }

        return (
          <Tag icon={icon} color={color}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Received Date",
      dataIndex: "payout_received_date",
      width: 140,
      render: (v, r) => {
        const paymentStatus = getPaymentStatus(r);

        return (
          <DatePicker
            size="small"
            value={v ? dayjs(v) : null}
            onChange={(date, dateString) =>
              updateReceivableInBackend(
                normalizePayoutId(r),
                {
                  payout_received_date: dateString,
                  payout_status: dateString ? "Received" : "Expected",
                },
                dateString
                  ? {
                      action: "Received Date Set",
                      details: `Date: ${dateString}`,
                    }
                  : null,
              )
            }
            style={{ width: "100%" }}
            format="DD MMM YY"
            placeholder="Not received"
            disabled={paymentStatus.isFullyPaid}
          />
        );
      },
    },
    {
      title: "Actions",
      width: 140,
      align: "center",
      render: (_, r) => {
        const paymentStatus = getPaymentStatus(r);
        const hasPayments = safeArray(r.payment_history).length > 0;

        return (
          <Space size="small">
            {hasPayments && (
              <Tooltip title="View/Edit payments">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openPaymentHistoryModal(r)}
                >
                  <Badge count={safeArray(r.payment_history).length} />
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Activity timeline">
              <Button
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => openTimelineModal(r)}
              >
                {safeArray(r.activity_log).length > 0 && (
                  <Badge count={safeArray(r.activity_log).length} />
                )}
              </Button>
            </Tooltip>
            {!paymentStatus.isFullyPaid && (
              <Tooltip title="Record payment">
                <Button
                  type="text"
                  icon={<DollarOutlined />}
                  onClick={() => openPartialPaymentModal(r)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const bulkActionsMenu = (
    <Menu>
      <Menu.Item
        key="collected"
        icon={<CheckCircleOutlined />}
        onClick={openBulkCollectionModal}
      >
        Record Collections
      </Menu.Item>
    </Menu>
  );

  /* ── Gradient theme map for stat cards ── */
  const STAT_GRADIENTS = {
    total: "from-sky-500 to-indigo-600",
    collected: "from-emerald-500 to-green-600",
    pending: "from-amber-500 to-orange-600",
    overdue: "from-rose-500 to-red-600",
  };

  return (
    <div className="px-4 md:px-6 py-6 bg-slate-50 dark:bg-[#171717] min-h-screen">
      {messageContextHolder}
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#262626] text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-2">
              <DollarOutlined style={{ fontSize: 11 }} />
              Payouts
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
              Collections Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage receivables and track collections
            </p>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="large"
            >
              Export
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadReceivables}
              size="large"
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* ── Gradient Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => {
            const gradient =
              STAT_GRADIENTS[stat.id] || "from-slate-600 to-slate-800";
            return (
              <div
                key={stat.id}
                className={`relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${gradient} p-4 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/70">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
                      {stat.value}
                    </p>
                    {stat.subtext && (
                      <p className="mt-1 text-xs text-white/80">
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                  <div className="mt-1 h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shrink-0">
                    <span className="text-lg">{stat.icon}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {bankSummary.length > 0 && (
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 mb-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">
              Bank-wise Pending Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {bankSummary.slice(0, 8).map((bank, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-[#262626] rounded-xl border border-slate-100 dark:border-[#303030]"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {bank.bank}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {bank.count} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(bank.pending)}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(bank.collected)} ✓
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="xl:col-span-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by Loan ID, Customer, Bank..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Status</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Partial">Partial</Option>
              <Option value="Received">Received</Option>
            </Select>
            <Select
              value={ageFilter}
              onChange={setAgeFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Ages</Option>
              <Option value="0-7">0-7 days</Option>
              <Option value="8-15">8-15 days</Option>
              <Option value="16-30">16-30 days</Option>
              <Option value="30+">30+ days</Option>
            </Select>
            <Select
              value={bankFilter}
              onChange={setBankFilter}
              size="large"
              className="w-full"
              showSearch
            >
              <Option value="All">All Parties</Option>
              {bankOptions.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </div>
          {(statusFilter !== "All" ||
            bankFilter !== "All" ||
            searchText ||
            ageFilter !== "All" ||
            amountRangeFilter !== "All") && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#262626]">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setBankFilter("All");
                  setSearchText("");
                  setAgeFilter("All");
                  setAmountRangeFilter("All");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {selectedRows.length} receivable(s) selected
            </span>
            <Space>
              <Button
                onClick={() => {
                  setSelectedRowKeys([]);
                  setSelectedRows([]);
                }}
              >
                Clear Selection
              </Button>
              <Dropdown overlay={bulkActionsMenu} trigger={["click"]}>
                <Button type="primary">
                  Bulk Actions <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#262626] bg-slate-50/70 dark:bg-[#1a1a1a]">
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
            <Tag color="blue">Rows: {filteredSubtotals.rowCount}</Tag>
            <Tag color="geekblue">
              Parties: {filteredSubtotals.partyCount}
            </Tag>
            <Tag color="green">
              Received: {formatCurrency(filteredSubtotals.received)}
            </Tag>
            <Tag color="orange">
              Pending: {formatCurrency(filteredSubtotals.pending)}
            </Tag>
            <Tag color="purple">
              Expected: {formatCurrency(filteredSubtotals.expected)}
            </Tag>
          </div>
        </div>
        <Table
          rowKey={(r) => r.payoutId || r.id}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rowsSelected) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rowsSelected);
            },
            getCheckboxProps: (record) => {
              const paymentStatus = getPaymentStatus(record);
              return {
                disabled: paymentStatus.isFullyPaid,
              };
            },
          }}
          columns={columns}
          dataSource={filteredRows}
          pagination={{
            pageSize: 15,
            showTotal: (total) => `Total ${total} receivables`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
          scroll={{ x: 1400 }}
        />
      </div>

      <Modal
        title="Record Bulk Collections"
        open={bulkCollectionModalVisible}
        onOk={handleBulkCollectionSave}
        onCancel={() => setBulkCollectionModalVisible(false)}
        width={700}
        okText="Record Payments"
      >
        <Form form={bulkForm} layout="vertical">
          <p className="mb-4 text-gray-600">
            Recording collections for <strong>{selectedRows.length}</strong>{" "}
            receivable(s).
          </p>

          <Form.Item
            name="received_date"
            label="Collection Date"
            rules={[
              { required: true, message: "Please select collection date" },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              size="large"
            />
          </Form.Item>

          <Space style={{ marginBottom: 16 }} wrap>
            <Button
              size="small"
              onClick={() => bulkForm.setFieldValue("received_date", dayjs())}
            >
              Today
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkForm.setFieldValue(
                  "received_date",
                  dayjs().subtract(1, "day"),
                )
              }
            >
              Yesterday
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkForm.setFieldValue("received_date", dayjs().day(5))
              }
            >
              Last Friday
            </Button>
          </Space>

          <div className="mt-4 mb-2 font-medium text-sm">
            Enter amount received for each item:
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedRows.map((row) => {
              const paymentStatus = getPaymentStatus(row);
              const payoutRowId = normalizePayoutId(row);
              return (
                <div
                  key={payoutRowId}
                  className="p-3 bg-gray-50 rounded border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {row.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Loan: {row.loanId}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expected: {formatCurrency(paymentStatus.expectedAmount)}
                      </div>
                      {paymentStatus.totalReceived > 0 && (
                        <div className="text-xs text-green-600">
                          Already Received:{" "}
                          {formatCurrency(paymentStatus.totalReceived)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-orange-600">
                        Pending: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    </div>
                  </div>
                  <Form.Item
                    name={`amount_${payoutRowId}`}
                    rules={[
                      { required: true, message: "Required" },
                      {
                        validator: (_, value) => {
                          if (
                            value > 0 &&
                            value <= paymentStatus.pendingAmount + 100
                          ) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error(
                              `Amount should not exceed ${formatCurrency(paymentStatus.pendingAmount)}`,
                            ),
                          );
                        },
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      prefix="₹"
                      placeholder="Enter amount received"
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                      min={0}
                      max={paymentStatus.pendingAmount}
                    />
                  </Form.Item>
                </div>
              );
            })}
          </div>
        </Form>
      </Modal>

      <Modal
        title="Record Payment"
        open={partialPaymentModalVisible}
        onOk={handlePartialPaymentSave}
        onCancel={() => setPartialPaymentModalVisible(false)}
        width={500}
        okText="Record Payment"
      >
        {currentRecord && (
          <Form form={partialPaymentForm} layout="vertical">
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600 mb-1">Expected Amount</div>
              <div className="text-lg font-semibold">
                {formatCurrency(getExpectedAmount(currentRecord))}
              </div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                if (paymentStatus.totalReceived > 0) {
                  return (
                    <>
                      <div className="text-sm text-green-600 mt-2">
                        Already Received:{" "}
                        {formatCurrency(paymentStatus.totalReceived)}
                      </div>
                      <div className="text-sm text-orange-600 font-medium">
                        Remaining: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <Form.Item
              name="payment_amount"
              label="Payment Amount"
              rules={[
                { required: true, message: "Please enter payment amount" },
                {
                  validator: (_, value) => {
                    const paymentStatus = getPaymentStatus(currentRecord);
                    if (
                      value > 0 &&
                      value <= paymentStatus.pendingAmount + 100
                    ) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        `Amount should not exceed ${formatCurrency(paymentStatus.pendingAmount)}`,
                      ),
                    );
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                prefix="₹"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                size="large"
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="payment_date"
              label="Payment Date"
              rules={[
                { required: true, message: "Please select payment date" },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                size="large"
              />
            </Form.Item>

            <Form.Item name="payment_remarks" label="Remarks (optional)">
              <Input.TextArea
                rows={2}
                placeholder="Payment method, reference number, etc."
              />
            </Form.Item>

            {safeArray(currentRecord.payment_history).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">
                  Previous Payments:
                </div>
                <div className="space-y-1">
                  {currentRecord.payment_history.map((p, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-600 p-2 bg-gray-50 rounded"
                    >
                      • {formatCurrency(p.amount)} on{" "}
                      {dayjs(p.date).format("DD MMM YYYY")}
                      {p.remarks && ` - ${p.remarks}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form>
        )}
      </Modal>

      <Modal
        title="Payment History"
        open={paymentHistoryModalVisible}
        onCancel={() => setPaymentHistoryModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setPaymentHistoryModalVisible(false)}
          >
            Close
          </Button>,
        ]}
        width={700}
      >
        {currentRecord && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-semibold">{currentRecord.customerName}</div>
              <div className="text-sm text-gray-600">
                Payout ID: {currentRecord.payoutId}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Expected: {formatCurrency(getExpectedAmount(currentRecord))}
              </div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                return (
                  <>
                    <div className="text-sm text-green-600">
                      Total Received:{" "}
                      {formatCurrency(paymentStatus.totalReceived)}
                    </div>
                    {!paymentStatus.isFullyPaid && (
                      <div className="text-sm text-orange-600 font-medium">
                        Pending: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {safeArray(currentRecord.payment_history).length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {currentRecord.payment_history.map((payment, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border rounded flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Date: {dayjs(payment.date).format("DD MMM YYYY")}
                      </div>
                      {payment.remarks && (
                        <div className="text-xs text-gray-500 mt-1">
                          Remarks: {payment.remarks}
                        </div>
                      )}
                      {payment.edited_at && (
                        <div className="text-xs text-blue-500 mt-1">
                          Edited on{" "}
                          {dayjs(payment.edited_at).format("DD MMM YYYY")}
                        </div>
                      )}
                    </div>
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditPayment(payment, idx)}
                      />
                      <Popconfirm
                        title="Delete this payment?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDeletePayment(idx)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Payment"
        open={editPaymentModalVisible}
        onOk={handleEditPaymentSave}
        onCancel={() => setEditPaymentModalVisible(false)}
        okText="Save Changes"
      >
        <Form form={editPaymentForm} layout="vertical">
          <Form.Item
            name="payment_amount"
            label="Payment Amount"
            rules={[{ required: true, message: "Please enter payment amount" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              prefix="₹"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
              size="large"
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="payment_date"
            label="Payment Date"
            rules={[{ required: true, message: "Please select payment date" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              size="large"
            />
          </Form.Item>

          <Form.Item name="payment_remarks" label="Remarks">
            <Input.TextArea
              rows={2}
              placeholder="Payment method, reference number, etc."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Activity Timeline"
        open={timelineModalVisible}
        onCancel={() => setTimelineModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTimelineModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {currentRecord && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-semibold">{currentRecord.customerName}</div>
              <div className="text-sm text-gray-600">
                Payout ID: {currentRecord.payoutId}
              </div>
            </div>

            {safeArray(currentRecord.activity_log).length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No activity recorded yet
              </div>
            ) : (
              <Timeline
                items={safeArray(currentRecord.activity_log)
                  .reverse()
                  .map((log, idx) => ({
                    children: (
                      <div key={idx}>
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-gray-500">
                          {log.details}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {log.date}
                        </div>
                      </div>
                    ),
                    color: idx === 0 ? "blue" : "gray",
                  }))}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayoutReceivablesDashboard;
