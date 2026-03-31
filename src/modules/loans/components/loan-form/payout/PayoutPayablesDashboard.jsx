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

const { Option } = Select;

/* ==============================
   Helpers
============================== */
const safeArray = (v) => (Array.isArray(v) ? v : []);

const firstNonEmptyArray = (...candidates) => {
  for (const c of candidates) {
    const arr = safeArray(c);
    if (arr.length > 0) return arr;
  }
  return [];
};

const getPayablesArray = (loan) =>
  firstNonEmptyArray(
    loan?.loan_payables,
    loan?.loanPayables,
    loan?.payables,
    loan?.loan_payouts,
  );

const getPayablesKey = (loan) => {
  if (Object.prototype.hasOwnProperty.call(loan || {}, "loan_payables")) {
    return "loan_payables";
  }
  if (safeArray(loan?.loan_payables).length > 0) return "loan_payables";
  if (safeArray(loan?.loanPayables).length > 0) return "loanPayables";
  if (safeArray(loan?.payables).length > 0) return "payables";
  if (safeArray(loan?.loan_payouts).length > 0) return "loan_payouts";
  return "loan_payables";
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

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

const getCreatedDate = (record) =>
  record?.created_date ||
  record?.payout_createdAt ||
  record?.payout_created_date ||
  record?.createdAt ||
  null;

const getExpectedAmount = (record) => {
  const net = Number(record?.net_payout_amount);
  if (Number.isFinite(net) && net > 0) return net;
  return Number(record?.payout_amount || 0) - Number(record?.tds_amount || 0);
};

const calculateDaysPending = (paidDate, createdDate) => {
  if (paidDate) return null;
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
  if (paymentStatus.isFullyPaid) return "Paid";
  if (paymentStatus.isPartial) return "Partial";
  if (rawStatus === "Received" || rawStatus === "Paid") return "Paid";
  return "Expected";
};

const toBackendStatus = (uiStatus) => {
  if (uiStatus === "Paid") return "Received";
  if (uiStatus === "Partial") return "Partial";
  return "Expected";
};

const getPaymentStatus = (record) => {
  const expectedAmount = getExpectedAmount(record);
  const paymentHistory = safeArray(record?.payment_history);
  const totalPaid = paymentHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    expectedAmount,
    totalPaid,
    pendingAmount: Math.max(0, expectedAmount - totalPaid),
    percentagePaid: expectedAmount > 0 ? (totalPaid / expectedAmount) * 100 : 0,
    isPartial: totalPaid > 0 && totalPaid < expectedAmount,
    isFullyPaid: totalPaid >= expectedAmount && totalPaid > 0,
  };
};

/* ==============================
   Component
============================== */
const PayoutPayablesDashboard = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [ageFilter, setAgeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const [bulkPaymentModalVisible, setBulkPaymentModalVisible] = useState(false);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] = useState(false);
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false);
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] = useState(false);

  const [currentRecord, setCurrentRecord] = useState(null);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);

  const [bulkForm] = Form.useForm();
  const [partialPaymentForm] = Form.useForm();
  const [editPaymentForm] = Form.useForm();

  const loadPayables = async () => {
    try {
      const pageSize = 300;
      let skip = 0;
      let hasMore = true;
      const allLoans = [];

      while (hasMore) {
        const res = await loansApi.getAll({
          limit: pageSize,
          skip,
          noCount: true,
          filterLoanType: "New Car",
          view: "dashboard",
          sortBy: "leadDate",
          sortDir: "desc",
        });
        const pageLoans = safeArray(res?.data);
        allLoans.push(...pageLoans);
        hasMore = Boolean(res?.hasMore);
        skip += pageSize;
      }

      const payables = allLoans.flatMap((loan) => {
        const list = getPayablesArray(loan);

        const payableList = list.filter((p) => {
          const type = p?.payout_type;
          const direction = p?.payout_direction;
          return (
            type === "Dealer" ||
            type === "Source" ||
            type === "Broker" ||
            direction === "Payable"
          );
        });

        return payableList.map((p) => ({
          ...p,
          loanId: loan.loanId || loan.id || "-",
          loanMongoId: loan._id || loan.id,
          customerName: getCustomerNameFromLoan(loan),
          dealerName: loan.dealerName || loan.delivery_dealerName || "-",
          payment_history: safeArray(p.payment_history),
          activity_log: safeArray(p.activity_log),
          created_date: getCreatedDate(p),
        }));
      });

      setLoans(allLoans);
      setRows(payables);
    } catch (err) {
      console.error("Failed to load payables:", err);
      messageApi.error("Failed to load payables");
    }
  };

  useEffect(() => {
    loadPayables();
  }, []);

  const updatePayableInBackend = async (payoutId, patch, activityAction = null) => {
    const sourceLoans = Array.isArray(loans) ? loans : [];
    let targetLoan = null;
    let updatedList = null;
    let key = "loan_payables";

    for (const loan of sourceLoans) {
      const k = getPayablesKey(loan);
      const list = safeArray(loan[k]);
      if (!list.length) continue;
      if (list.some((p) => p.payoutId === payoutId)) {
        key = k;
        targetLoan = loan;
        updatedList = list.map((p) => {
          if (p.payoutId !== payoutId) return p;
          const updated = { ...p, ...patch };
          if (activityAction) {
            updated.activity_log = addActivityLog(
              p.activity_log,
              activityAction.action,
              activityAction.details,
            );
          }
          return updated;
        });
        break;
      }
    }

    if (!targetLoan || !updatedList) return;

    try {
      await loansApi.update(targetLoan._id || targetLoan.loanId || targetLoan.id, {
        [key]: updatedList,
      });
      await loadPayables();
    } catch (err) {
      console.error("Failed to update payable:", err);
      messageApi.error("Failed to update payable");
    }
  };

  const applyBulkUpdates = async (updateFactory) => {
    const updatesByLoan = new Map();

    for (const loan of loans) {
      const key = getPayablesKey(loan);
      const list = safeArray(loan[key]);
      if (!list.length) continue;

      const updated = list.map((p) => updateFactory(p));
      if (updated.some((u, idx) => u !== list[idx])) {
        updatesByLoan.set(loan._id || loan.loanId || loan.id, { key, updated });
      }
    }

    await Promise.all(
      Array.from(updatesByLoan.entries()).map(([loanId, payload]) =>
        loansApi.update(loanId, { [payload.key]: payload.updated }),
      ),
    );
  };

  /* ==============================
     Stats & Party Summary
  ============================== */
  const partyOptions = useMemo(() => {
    const parties = Array.from(
      new Set(
        rows
          .map((r) => r.payout_party_name)
          .filter(Boolean)
          .map((b) => String(b).trim()),
      ),
    );
    return parties.sort();
  }, [rows]);

  const partySummary = useMemo(() => {
    const summary = {};
    rows.forEach((r) => {
      const party = r.payout_party_name || "Unknown";
      if (!summary[party]) {
        summary[party] = { total: 0, count: 0, pending: 0, paid: 0 };
      }

      const paymentStatus = getPaymentStatus(r);
      summary[party].total += paymentStatus.expectedAmount;
      summary[party].count += 1;
      summary[party].paid += paymentStatus.totalPaid;
      summary[party].pending += paymentStatus.pendingAmount;
    });

    return Object.entries(summary)
      .map(([party, data]) => ({ party, ...data }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  const stats = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    rows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      totalAmount += paymentStatus.expectedAmount;
      paidAmount += paymentStatus.totalPaid;

      if (!paymentStatus.isFullyPaid) {
        pendingAmount += paymentStatus.pendingAmount;
        pendingCount += 1;

        const days = calculateDaysPending(r.payout_paid_date || r.payout_received_date, r.created_date);
        if (days !== null && days > 15) {
          overdueCount += 1;
        }
      }
    });

    return [
      {
        id: "total",
        label: "Total Payables",
        value: formatCurrency(totalAmount),
        icon: <DollarOutlined />,
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      {
        id: "paid",
        label: "Paid",
        value: formatCurrency(paidAmount),
        icon: <CheckCircleOutlined />,
        bgColor: "bg-green-50 dark:bg-green-900/20",
        iconColor: "text-green-600 dark:text-green-400",
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCurrency(pendingAmount),
        subtext: `${pendingCount} items`,
        icon: <ClockCircleOutlined />,
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
      {
        id: "overdue",
        label: "Overdue (15+ days)",
        value: overdueCount,
        icon: <AlertOutlined />,
        bgColor: "bg-red-50 dark:bg-red-900/20",
        iconColor: "text-red-600 dark:text-red-400",
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

      const statusOk = statusFilter === "All" ? true : uiStatus === statusFilter;

      const partyOk =
        partyFilter === "All"
          ? true
          : normalizeText(r.payout_party_name) === normalizeText(partyFilter);

      const searchOk = searchText
        ? `${r.loanId} ${r.customerName} ${r.payout_party_name} ${r.payoutId}`
            .toLowerCase()
            .includes(searchText.toLowerCase())
        : true;

      let ageOk = true;
      if (ageFilter !== "All") {
        if (!paymentStatus.isFullyPaid) {
          const days = calculateDaysPending(r.payout_paid_date || r.payout_received_date, r.created_date);
          if (days !== null) {
            if (ageFilter === "0-7") ageOk = days <= 7;
            else if (ageFilter === "8-15") ageOk = days >= 8 && days <= 15;
            else if (ageFilter === "16-30") ageOk = days >= 16 && days <= 30;
            else if (ageFilter === "30+") ageOk = days > 30;
          }
        }
      }

      let typeOk = true;
      if (typeFilter !== "All") {
        typeOk = r.payout_type === typeFilter;
      }

      return statusOk && partyOk && searchOk && ageOk && typeOk;
    });
  }, [rows, statusFilter, partyFilter, searchText, ageFilter, typeFilter]);

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

    const totalPaid = updatedHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalPaid >= expectedAmount;

    await updatePayableInBackend(
      currentRecord.payoutId,
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Paid" : totalPaid > 0 ? "Partial" : "Expected"),
        payout_paid_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_paid_date,
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

    const totalPaid = updatedHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalPaid >= expectedAmount;

    await updatePayableInBackend(
      currentRecord.payoutId,
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Paid" : totalPaid > 0 ? "Partial" : "Expected"),
        payout_paid_date: isFullyPaid ? currentRecord.payout_paid_date : "",
        payout_received_date: isFullyPaid ? currentRecord.payout_received_date : "",
      },
      {
        action: "Payment Deleted",
        details: `Deleted payment: ${formatCurrency(deletedPayment.amount)} dated ${dayjs(deletedPayment.date).format("DD MMM YYYY")}`,
      },
    );

    messageApi.success("Payment deleted successfully");
  };

  /* ==============================
     Bulk Payment with Individual Amounts
  ============================== */
  const openBulkPaymentModal = () => {
    if (!selectedRows.length) {
      messageApi.warning("Please select at least 1 payable");
      return;
    }

    const initialValues = {
      paid_date: dayjs(),
    };

    selectedRows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      initialValues[`amount_${r.payoutId}`] = paymentStatus.pendingAmount;
    });

    bulkForm.setFieldsValue(initialValues);
    setBulkPaymentModalVisible(true);
  };

  const handleBulkPaymentSave = async () => {
    const values = await bulkForm.validateFields();
    const paidDate = values.paid_date.format("YYYY-MM-DD");
    const selectedIds = new Set(selectedRows.map((r) => r.payoutId));

    let updatedCount = 0;

    await applyBulkUpdates((p) => {
      if (!selectedIds.has(p.payoutId)) return p;

      const amountPaid = Number(values[`amount_${p.payoutId}`] || 0);
      if (amountPaid <= 0) return p;

      const existingHistory = safeArray(p.payment_history);
      const newHistory = [
        ...existingHistory,
        {
          amount: amountPaid,
          date: paidDate,
          remarks: "Bulk payment",
          timestamp: new Date().toISOString(),
        },
      ];

      const totalPaid = newHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const expectedAmount = getExpectedAmount(p);
      const isFullyPaid = totalPaid >= expectedAmount;
      updatedCount += 1;

      return {
        ...p,
        payment_history: newHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Paid" : "Partial"),
        payout_paid_date: isFullyPaid ? paidDate : p.payout_paid_date,
        payout_received_date: isFullyPaid ? paidDate : p.payout_received_date,
        activity_log: addActivityLog(
          p.activity_log,
          isFullyPaid ? "Full Payment Made" : "Partial Payment Recorded",
          `Paid ${formatCurrency(amountPaid)} on ${paidDate}. Total: ${formatCurrency(totalPaid)} of ${formatCurrency(expectedAmount)}`,
        ),
      };
    });

    await loadPayables();
    setSelectedRowKeys([]);
    setSelectedRows([]);
    setBulkPaymentModalVisible(false);
    messageApi.success(`${updatedCount} payables updated`);
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

    const totalPaid = newHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalPaid >= expectedAmount;

    await updatePayableInBackend(
      currentRecord.payoutId,
      {
        payment_history: newHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Paid" : "Partial"),
        payout_paid_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_paid_date,
        payout_received_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_received_date,
      },
      {
        action: isFullyPaid ? "Full Payment Made" : "Partial Payment Recorded",
        details: `Paid ${formatCurrency(payment.amount)} on ${payment.date}. Total: ${formatCurrency(totalPaid)} of ${formatCurrency(expectedAmount)}`,
      },
    );

    setPartialPaymentModalVisible(false);
    messageApi.success(isFullyPaid ? "Payment complete!" : "Partial payment recorded successfully");
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
        Party: r.payout_party_name,
        Type: r.payout_type,
        "Expected Amount": paymentStatus.expectedAmount,
        "Amount Paid": paymentStatus.totalPaid,
        "Pending Amount": paymentStatus.pendingAmount,
        Status: toUiStatus(r.payout_status, paymentStatus),
        "Days Pending":
          calculateDaysPending(r.payout_paid_date || r.payout_received_date, r.created_date) || "-",
        "Paid Date": r.payout_paid_date || r.payout_received_date || "-",
      };
    });

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
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
    link.setAttribute("download", `Payables_${dayjs().format("YYYY-MM-DD")}.csv`);
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
            <div className="font-semibold text-sm">{r.customerName}</div>
            <div className="text-xs text-gray-500 mt-0.5">Loan: {r.loanId}</div>
            <div className="text-xs text-gray-400 mt-0.5">ID: {r.payoutId}</div>
            {paymentStatus.isPartial && (
              <div className="mt-2">
                <Progress
                  percent={Math.round(paymentStatus.percentagePaid)}
                  size="small"
                  strokeColor="#faad14"
                  format={() => `${Math.round(paymentStatus.percentagePaid)}%`}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Party",
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
            <div className="text-base font-semibold">{formatCurrency(paymentStatus.expectedAmount)}</div>
            {Number(r.tds_amount || 0) > 0 && (
              <div className="text-xs text-gray-500">TDS: {formatCurrency(r.tds_amount)}</div>
            )}
            {paymentStatus.isPartial && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">✓ Paid: {formatCurrency(paymentStatus.totalPaid)}</div>
                <div className="text-xs text-orange-600 font-medium">⏳ Pending: {formatCurrency(paymentStatus.pendingAmount)}</div>
              </div>
            )}
            {paymentStatus.isFullyPaid && <div className="text-xs text-green-600 mt-1">✓ Fully Paid</div>}
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
          return <Tag color="success">Paid</Tag>;
        }

        const days = calculateDaysPending(r.payout_paid_date || r.payout_received_date, r.created_date);
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

        let status = "Expected";
        let color = "default";
        let icon = <ClockCircleOutlined />;

        if (paymentStatus.isFullyPaid) {
          status = "Paid";
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
      title: "Expected Date",
      dataIndex: "payout_expected_date",
      width: 140,
      render: (v, r) => {
        const paymentStatus = getPaymentStatus(r);

        return (
          <DatePicker
            size="small"
            value={v ? dayjs(v) : null}
            onChange={(date, dateString) =>
              updatePayableInBackend(
                r.payoutId,
                {
                  payout_expected_date: dateString,
                },
                dateString
                  ? {
                      action: "Expected Date Set",
                      details: `Date: ${dateString}`,
                    }
                  : null,
              )
            }
            style={{ width: "100%" }}
            format="DD MMM YY"
            placeholder="Not set"
            disabled={paymentStatus.isFullyPaid}
          />
        );
      },
    },
    {
      title: "Paid Date",
      dataIndex: "payout_paid_date",
      width: 140,
      render: (v, r) => {
        const paymentStatus = getPaymentStatus(r);
        const paidDate = v || r.payout_received_date;

        return (
          <DatePicker
            size="small"
            value={paidDate ? dayjs(paidDate) : null}
            onChange={(date, dateString) =>
              updatePayableInBackend(
                r.payoutId,
                {
                  payout_paid_date: dateString,
                  payout_received_date: dateString,
                  payout_status: dateString
                    ? toBackendStatus("Paid")
                    : toBackendStatus(
                        toUiStatus(r.payout_status, paymentStatus),
                      ),
                },
                dateString
                  ? {
                      action: "Paid Date Set",
                      details: `Date: ${dateString}`,
                    }
                  : null,
              )
            }
            style={{ width: "100%" }}
            format="DD MMM YY"
            placeholder="Not paid"
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
                <Button type="text" icon={<EditOutlined />} onClick={() => openPaymentHistoryModal(r)}>
                  <Badge count={safeArray(r.payment_history).length} />
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Activity timeline">
              <Button type="text" icon={<HistoryOutlined />} onClick={() => openTimelineModal(r)}>
                {safeArray(r.activity_log).length > 0 && <Badge count={safeArray(r.activity_log).length} />}
              </Button>
            </Tooltip>
            {!paymentStatus.isFullyPaid && (
              <Tooltip title="Record payment">
                <Button type="text" icon={<DollarOutlined />} onClick={() => openPartialPaymentModal(r)} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const bulkActionsMenu = (
    <Menu>
      <Menu.Item key="paid" icon={<CheckCircleOutlined />} onClick={openBulkPaymentModal}>
        Record Payments
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="p-6 min-h-screen">
      {messageContextHolder}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1 text-slate-900 dark:text-white">Payables Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track payouts to Dealers, Sources and Brokers</p>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport} size="large">
              Export
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadPayables} size="large">
              Refresh
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#252525] rounded-2xl p-4 hover:shadow-md transition cursor-default relative"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                  <span className={`${stat.iconColor} text-lg`}>{stat.icon}</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                  <div className="text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</div>
                  {stat.subtext && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.subtext}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {partySummary.length > 0 && (
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#252525] rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Party-wise Pending Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {partySummary.slice(0, 8).map((party, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-[#1e1e1e] rounded-lg">
                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{party.party}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{party.count} items</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(party.pending)}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(party.paid)} ✓</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#252525] rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="xl:col-span-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by Loan ID, Customer, Party..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
              />
            </div>
            <Select value={statusFilter} onChange={setStatusFilter} size="large" className="w-full">
              <Option value="All">All Status</Option>
              <Option value="Expected">Expected</Option>
              <Option value="Partial">Partial</Option>
              <Option value="Paid">Paid</Option>
            </Select>
            <Select value={typeFilter} onChange={setTypeFilter} size="large" className="w-full">
              <Option value="All">All Types</Option>
              <Option value="Dealer">Dealer</Option>
              <Option value="Source">Source</Option>
              <Option value="Broker">Broker</Option>
            </Select>
            <Select value={ageFilter} onChange={setAgeFilter} size="large" className="w-full">
              <Option value="All">All Ages</Option>
              <Option value="0-7">0-7 days</Option>
              <Option value="8-15">8-15 days</Option>
              <Option value="16-30">16-30 days</Option>
              <Option value="30+">30+ days</Option>
            </Select>
            <Select
              value={partyFilter}
              onChange={setPartyFilter}
              size="large"
              className="w-full"
              showSearch
            >
              <Option value="All">All Parties</Option>
              {partyOptions.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </div>
          {(statusFilter !== "All" ||
            partyFilter !== "All" ||
            searchText ||
            ageFilter !== "All" ||
            typeFilter !== "All") && (
            <div className="mt-3">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setPartyFilter("All");
                  setSearchText("");
                  setAgeFilter("All");
                  setTypeFilter("All");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-slate-800 dark:text-slate-100">{selectedRows.length} payable(s) selected</span>
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

      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#252525] rounded-2xl overflow-hidden">
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
            showTotal: (total) => `Total ${total} payables`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
          scroll={{ x: 1500 }}
        />
      </div>

      <Modal
        title="Record Bulk Payments"
        open={bulkPaymentModalVisible}
        onOk={handleBulkPaymentSave}
        onCancel={() => setBulkPaymentModalVisible(false)}
        width={700}
        okText="Record Payments"
      >
        <Form form={bulkForm} layout="vertical">
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Recording payments for <strong>{selectedRows.length}</strong> payable(s).
          </p>

          <Form.Item
            name="paid_date"
            label="Payment Date"
            rules={[{ required: true, message: "Please select payment date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" size="large" />
          </Form.Item>

          <Space style={{ marginBottom: 16 }} wrap>
            <Button size="small" onClick={() => bulkForm.setFieldValue("paid_date", dayjs())}>
              Today
            </Button>
            <Button size="small" onClick={() => bulkForm.setFieldValue("paid_date", dayjs().subtract(1, "day"))}>
              Yesterday
            </Button>
            <Button size="small" onClick={() => bulkForm.setFieldValue("paid_date", dayjs().day(5))}>
              Last Friday
            </Button>
          </Space>

          <div className="mt-4 mb-2 font-medium text-sm">Enter amount paid for each item:</div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedRows.map((row) => {
              const paymentStatus = getPaymentStatus(row);
              return (
                <div key={row.payoutId} className="p-3 bg-slate-50 dark:bg-[#1e1e1e] rounded border border-slate-200 dark:border-[#2e2e2e]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{row.payout_party_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Loan: {row.loanId}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Expected: {formatCurrency(paymentStatus.expectedAmount)}
                      </div>
                      {paymentStatus.totalPaid > 0 && (
                        <div className="text-xs text-green-600">
                          Already Paid: {formatCurrency(paymentStatus.totalPaid)}
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
                    name={`amount_${row.payoutId}`}
                    rules={[
                      { required: true, message: "Required" },
                      {
                        validator: (_, value) => {
                          if (value > 0 && value <= paymentStatus.pendingAmount + 100) {
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
                      placeholder="Enter amount paid"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
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
              <div className="text-lg font-semibold">{formatCurrency(getExpectedAmount(currentRecord))}</div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                if (paymentStatus.totalPaid > 0) {
                  return (
                    <>
                      <div className="text-sm text-green-600 mt-2">
                        Already Paid: {formatCurrency(paymentStatus.totalPaid)}
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
                    if (value > 0 && value <= paymentStatus.pendingAmount + 100) {
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
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
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
              <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" size="large" />
            </Form.Item>

            <Form.Item name="payment_remarks" label="Remarks (optional)">
              <Input.TextArea rows={2} placeholder="Payment method, reference number, etc." />
            </Form.Item>

            {safeArray(currentRecord.payment_history).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Previous Payments:</div>
                <div className="space-y-1">
                  {currentRecord.payment_history.map((p, idx) => (
                    <div key={idx} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                      • {formatCurrency(p.amount)} on {dayjs(p.date).format("DD MMM YYYY")}
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
          <Button key="close" onClick={() => setPaymentHistoryModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {currentRecord && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-semibold">{currentRecord.payout_party_name}</div>
              <div className="text-sm text-gray-600">Payout ID: {currentRecord.payoutId}</div>
              <div className="text-sm text-gray-600 mt-2">Expected: {formatCurrency(getExpectedAmount(currentRecord))}</div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                return (
                  <>
                    <div className="text-sm text-green-600">Total Paid: {formatCurrency(paymentStatus.totalPaid)}</div>
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
              <div className="text-center text-gray-400 py-8">No payments recorded yet</div>
            ) : (
              <div className="space-y-2">
                {currentRecord.payment_history.map((payment, idx) => (
                  <div key={idx} className="p-3 bg-white border rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-gray-500">Date: {dayjs(payment.date).format("DD MMM YYYY")}</div>
                      {payment.remarks && <div className="text-xs text-gray-500 mt-1">Remarks: {payment.remarks}</div>}
                      {payment.edited_at && (
                        <div className="text-xs text-blue-500 mt-1">
                          Edited on {dayjs(payment.edited_at).format("DD MMM YYYY")}
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
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
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
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" size="large" />
          </Form.Item>

          <Form.Item name="payment_remarks" label="Remarks">
            <Input.TextArea rows={2} placeholder="Payment method, reference number, etc." />
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
              <div className="font-semibold">{currentRecord.payout_party_name}</div>
              <div className="text-sm text-gray-600">Payout ID: {currentRecord.payoutId}</div>
            </div>

            {safeArray(currentRecord.activity_log).length === 0 ? (
              <div className="text-center text-gray-400 py-8">No activity recorded yet</div>
            ) : (
              <Timeline
                items={safeArray(currentRecord.activity_log)
                  .reverse()
                  .map((log, idx) => ({
                    children: (
                      <div key={idx}>
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-gray-500">{log.details}</div>
                        <div className="text-xs text-gray-400 mt-1">{log.date}</div>
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

export default PayoutPayablesDashboard;
