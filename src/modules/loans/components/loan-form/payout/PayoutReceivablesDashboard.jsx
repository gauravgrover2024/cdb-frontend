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
  Tabs,
  Timeline,
  Dropdown,
  Menu,
  Radio,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  DollarOutlined,
  AlertOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  BellOutlined,
  DownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx/dist/xlsx.full.min.js";
import { loansApi } from "../../../../../api/loans";
import { formatINR, formatINRInput, parseINRInput } from "../../../../../utils/currency";

const { Option } = Select;
const { TextArea } = Input;

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

const getReceivablesKey = (loan) => {
  if (safeArray(loan.loan_receivables).length > 0) return "loan_receivables";
  if (safeArray(loan.loanReceivables).length > 0) return "loanReceivables";
  if (safeArray(loan.receivables).length > 0) return "receivables";
  if (safeArray(loan.loan_payouts).length > 0) return "loan_payouts";
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

const formatCurrency = (val) => formatINR(val);

const calculateDaysPending = (receivedDate, createdDate) => {
  if (receivedDate) return null;
  const start = createdDate ? dayjs(createdDate) : dayjs();
  const today = dayjs();
  return today.diff(start, "day");
};

// Add activity log entry
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

/* ==============================
   Component
============================== */
const PayoutReceivablesDashboard = () => {
  const [rows, setRows] = useState([]);
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");  const [bankFilter, setBankFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [ageFilter, setAgeFilter] = useState("All");
  const [amountRangeFilter, setAmountRangeFilter] = useState("All");
  const [quickView, setQuickView] = useState("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [bulkCollectionModalVisible, setBulkCollectionModalVisible] = useState(false);
  const [bulkEditModalVisible, setBulkEditModalVisible] = useState(false);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] = useState(false);

  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [bulkEditForm] = Form.useForm();
  const [partialPaymentForm] = Form.useForm();

  const loadReceivables = async () => {
    try {
      const res = await loansApi.getAll("?limit=10000&skip=0");
      const savedLoans = res?.data || [];
      console.log("📦 savedLoans count:", savedLoans.length);

      const receivables = savedLoans.flatMap((loan) => {
        const list = firstNonEmptyArray(
          loan.loan_receivables,
          loan.loanReceivables,
          loan.receivables,
          loan.loan_payouts,
        );

        const receivableList = list.filter((p) => {
          const type = p?.payout_type;
          const direction = p?.payout_direction;
          return (
            type === "Bank" || type === "Insurance" || direction === "Receivable"
          );
        });

        return receivableList.map((p) => ({
          ...p,
          loanId: loan.loanId || loan.id || "-",
          loanMongoId: loan._id || loan.id,
          customerName: getCustomerNameFromLoan(loan),
          approval_bankName: loan.approval_bankName || "-",
          approval_status: loan.approval_status || "-",
          netLoanApproved: loan.approval_breakup_netLoanApproved || 0,
          collection_remarks: p.collection_remarks || "",
          collection_last_followup: p.collection_last_followup || "",
          collection_next_action: p.collection_next_action || "",
          created_date: p.created_date || p.payout_created_date || "",
          actual_amount_received: p.actual_amount_received || null,
          payment_history: p.payment_history || [],
          activity_log: p.activity_log || [],
          priority: p.priority || "Medium",
        }));
      });

      console.log("✅ Total receivables loaded:", receivables.length);
      setLoans(savedLoans);
      setRows(receivables);
    } catch (err) {
      console.error("❌ Failed to load loans:", err);
      message.error("Failed to load receivables");
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

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

  // Bank-wise Summary
  const bankSummary = useMemo(() => {
    const summary = {};
    rows.forEach((r) => {
      const bank = r.payout_party_name || "Unknown";
      if (!summary[bank]) {
        summary[bank] = { total: 0, count: 0, pending: 0, collected: 0 };
      }
      const amount = Number(r.payout_amount || 0);
      summary[bank].total += amount;
      summary[bank].count += 1;

      if (r.payout_status === "Received") {
        summary[bank].collected += amount;
      } else {summary[bank].pending += amount;
      }
    });

    return Object.entries(summary)
      .map(([bank, data]) => ({ bank, ...data }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  const stats = useMemo(() => {
    const totalAmount = rows.reduce(
      (sum, r) => sum + Number(r.payout_amount || 0),
      0,
    );
    const collectedAmount = rows
      .filter((r) => r.payout_status === "Received")
      .reduce((sum, r) => sum + Number(r.payout_amount || 0), 0);
    const pendingAmount = totalAmount - collectedAmount;
    const pendingCount = rows.filter(
      (r) => r.payout_status !== "Received",
    ).length;
    const overdueCount = rows.filter((r) => {
      if (r.payout_status === "Received") return false;
      const days = calculateDaysPending(r.payout_received_date, r.created_date);
      return days !== null && days > 15;
    }).length;

    // Follow-up reminders
    const followUpDueToday = rows.filter((r) => {
      if (r.payout_status === "Received") return false;
      if (!r.collection_next_action) return false;
      return dayjs(r.collection_next_action).isSame(dayjs(), "day");
    }).length;

    return [
      {
        id: "total",
        label: "Total Receivables",
        value: formatCurrency(totalAmount),
        icon: <DollarOutlined />,
        iconColor: "text-primary",
      },
      {
        id: "collected",
        label: "Collected",
        value: formatCurrency(collectedAmount),
        icon: <CheckCircleOutlined />,
        iconColor: "text-success",
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCurrency(pendingAmount),
        subtext: `${pendingCount} items`,
        icon: <ClockCircleOutlined />,
        iconColor: "text-warning",
      },
      {
        id: "overdue",
        label: "Overdue (15+ days)",
        value: overdueCount,
        icon: <AlertOutlined />,
        iconColor: "text-destructive",
      },
      {
        id: "followup",
        label: "Follow-up Due Today",
        value: followUpDueToday,
        icon: <BellOutlined />,
        iconColor: "text-primary",
        badge: followUpDueToday > 0,
      },
    ];
  }, [rows]);

  /* ==============================
     Filters
  ============================== */
  const filteredRows = useMemo(() => {
    let filtered = [...rows];

    // Quick view filter
    const today = dayjs();
    if (quickView === "due-today") {
      filtered = filtered.filter((r) => {
        if (r.payout_status === "Received") return false;
        if (!r.collection_next_action) return false;
        return dayjs(r.collection_next_action).isSame(today, "day");
      });
    } else if (quickView === "due-week") {
      filtered = filtered.filter((r) => {
        if (r.payout_status === "Received") return false;
        if (!r.collection_next_action) return false;
        const nextAction = dayjs(r.collection_next_action);
        return (
          nextAction.isAfter(today) && nextAction.isBefore(today.add(7, "day"))
        );
      });
    } else if (quickView === "overdue") {
      filtered = filtered.filter((r) => {
        if (r.payout_status === "Received") return false;
        const days = calculateDaysPending(
          r.payout_received_date,
          r.created_date,
        );
        return days !== null && days > 0;
      });
    } else if (quickView === "critical") {
      filtered = filtered.filter((r) => {
        if (r.payout_status === "Received") return false;
        const days = calculateDaysPending(
          r.payout_received_date,
          r.created_date,
        );
        return days !== null && days > 30;
      });
    }

    // Regular filters
    filtered = filtered.filter((r) => {
      const statusOk =
        statusFilter === "All" ? true : r.payout_status === statusFilter;

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
      if (ageFilter !== "All" && r.payout_status !== "Received") {
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

      // Amount range filter
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

    return filtered;
  }, [
    rows,
    statusFilter,
    bankFilter,
    searchText,
    ageFilter,
    amountRangeFilter,
    quickView,
  ]);

  /* ==============================
     Storage Updates with Backend
  ============================== */
  const updateReceivableInStorage = async (
    payoutId,
    patch,
    activityAction = null,
  ) => {
    const sourceLoans = Array.isArray(loans) ? loans : [];
    let targetLoanId = null;
    let targetLoan = null;

    const updatedLoans = sourceLoans.map((loan) => {
      const key = getReceivablesKey(loan);
      const receivables = safeArray(loan[key]);

      if (!receivables.length) return loan;

      const updatedReceivables = receivables.map((p) => {
        if (p.payoutId !== payoutId) return p;
        targetLoanId = loan._id || loan.loanId || loan.id;
        targetLoan = loan;

        const updated = { ...p, ...patch };

        // Add activity log if action specified
        if (activityAction) {
          updated.activity_log = addActivityLog(
            p.activity_log,
            activityAction.action,
            activityAction.details,
          );
        }

        return updated;
      });

      return { ...loan, [key]: updatedReceivables };
    });

    // Update backend
    try {
      if (targetLoanId && targetLoan) {
        const key = getReceivablesKey(targetLoan);
        const updatedLoan = updatedLoans.find(
          (l) => (l._id || l.loanId || l.id) === targetLoanId
        );
        
        await loansApi.update(targetLoanId, {
          [key]: updatedLoan[key],
        });
        message.success("Updated successfully");
      }
    } catch (err) {
      console.error("Failed to update receivable:", err);
      message.error("Failed to update. Please try again.");
    } finally {
      loadReceivables();
    }
  };

  // Bulk Edit
  const handleBulkEdit = () => {
    if (!selectedRows.length) {
      message.warning("Please select at least 1 receivable");
      return;
    }
    bulkEditForm.resetFields();
    setBulkEditModalVisible(true);
  };

  const handleBulkEditSave = async () => {
    try {
      const values = await bulkEditForm.validateFields();
      const selectedIds = new Set(selectedRows.map((r) => r.payoutId));

      // Group by loan
      const loanUpdates = {};
      
      loans.forEach((loan) => {
        const key = getReceivablesKey(loan);
        const receivables = safeArray(loan[key]);
        if (!receivables.length) return;

        const updatedReceivables = receivables.map((p) => {
          if (!selectedIds.has(p.payoutId)) return p;

          const updates = {};
          if (values.bulk_priority) updates.priority = values.bulk_priority;
          if (values.bulk_next_action)
            updates.collection_next_action =
              values.bulk_next_action.format("YYYY-MM-DD");
          if (values.bulk_remarks)
            updates.collection_remarks =
              (p.collection_remarks || "") + "\n" + values.bulk_remarks;

          return {
            ...p,
            ...updates,
            activity_log: addActivityLog(
              p.activity_log,
              "Bulk Edit",
              `Priority: ${values.bulk_priority || "unchanged"}, Remarks added`,
            ),
          };
        });

        if (updatedReceivables.some((r) => selectedIds.has(r.payoutId))) {
          loanUpdates[loan._id || loan.loanId || loan.id] = {
            [key]: updatedReceivables,
          };
        }
      });

      // Update backend
      await Promise.all(
        Object.entries(loanUpdates).map(([loanId, updates]) =>
          loansApi.update(loanId, updates)
        )
      );

      message.success(`${selectedIds.size} receivables updated`);
      setBulkEditModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      loadReceivables();
    } catch (err) {
      console.error("Bulk edit failed:", err);
      message.error("Failed to update. Please try again.");
    }
  };

  // Bulk Collection
  const openBulkCollectionModal = () => {
    if (!selectedRows.length) {
      message.warning("Please select at least 1 receivable");
      return;
    }

    const totalExpected = selectedRows.reduce(
      (sum, r) =>
        sum + (Number(r.payout_amount || 0) - Number(r.tds_amount || 0)),
      0,
    );

    bulkForm.setFieldsValue({
      received_date: dayjs(),
      total_amount_received: totalExpected,
    });

    setBulkCollectionModalVisible(true);
  };

  const handleBulkCollectionSave = async () => {
    try {
      const values = await bulkForm.validateFields();
      const receivedDate = values.received_date.format("YYYY-MM-DD");
      const totalReceived = values.total_amount_received;
      const selectedIds = new Set(selectedRows.map((r) => r.payoutId));

      // Group by loan
      const loanUpdates = {};
      
      loans.forEach((loan) => {
        const key = getReceivablesKey(loan);
        const receivables = safeArray(loan[key]);
        if (!receivables.length) return;

        const updatedReceivables = receivables.map((p) => {
          if (!selectedIds.has(p.payoutId)) return p;

          return {
            ...p,
            payout_status: "Received",
            payout_received_date: receivedDate,
            actual_amount_received: totalReceived,
            activity_log: addActivityLog(
              p.activity_log,
              "Marked as Collected",
              `Amount: ${formatCurrency(totalReceived)}, Date: ${receivedDate}`,
            ),
          };
        });

        if (updatedReceivables.some((r) => selectedIds.has(r.payoutId))) {
          loanUpdates[loan._id || loan.loanId || loan.id] = {
            [key]: updatedReceivables,
          };
        }
      });

      // Update backend
      await Promise.all(
        Object.entries(loanUpdates).map(([loanId, updates]) =>
          loansApi.update(loanId, updates)
        )
      );

      message.success(`${selectedIds.size} receivables marked as collected`);
      setBulkCollectionModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      loadReceivables();
    } catch (err) {
      console.error("Bulk collection failed:", err);
      message.error("Failed to update. Please try again.");
    }
  };

  // Partial Payment
  const openPartialPaymentModal = (record) => {
    setCurrentRecord(record);
    const expectedAmount =
      Number(record.payout_amount || 0) - Number(record.tds_amount || 0);
    const receivedSoFar = (record.payment_history || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    partialPaymentForm.setFieldsValue({
      payment_amount: expectedAmount - receivedSoFar,
      payment_date: dayjs(),
    });

    setPartialPaymentModalVisible(true);
  };

  const handlePartialPaymentSave = async () => {
    try {
      const values = await partialPaymentForm.validateFields();
      const payment = {
        amount: values.payment_amount,
        date: values.payment_date.format("YYYY-MM-DD"),
        remarks: values.payment_remarks || "",
        timestamp: new Date().toISOString(),
      };

      const existingHistory = currentRecord.payment_history || [];
      const newHistory = [...existingHistory, payment];

      const totalReceived = newHistory.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      const expectedAmount =
        Number(currentRecord.payout_amount || 0) -
        Number(currentRecord.tds_amount || 0);

      const isFullyPaid = totalReceived >= expectedAmount;

      await updateReceivableInStorage(
        currentRecord.payoutId,
        {
          payment_history: newHistory,
          payout_status: isFullyPaid ? "Received" : "Partial",
          payout_received_date: isFullyPaid
            ? values.payment_date.format("YYYY-MM-DD")
            : currentRecord.payout_received_date,
          actual_amount_received: totalReceived,
        },
        {
          action: "Partial Payment",
          details: `Received ${formatCurrency(payment.amount)} on ${payment.date}`,
        },
      );

      setPartialPaymentModalVisible(false);
      message.success("Payment recorded successfully");
    } catch (err) {
      console.error("Partial payment save failed:", err);
    }
  };

  // Activity Timeline
  const openTimelineModal = (record) => {
    setCurrentRecord(record);
    setTimelineModalVisible(true);
  };

  // Remarks Modal
  const openRemarksModal = (record) => {
    setCurrentRecord(record);
    form.setFieldsValue({
      collection_remarks: record.collection_remarks || "",
      collection_last_followup: record.collection_last_followup
        ? dayjs(record.collection_last_followup)
        : null,
      collection_next_action: record.collection_next_action
        ? dayjs(record.collection_next_action)
        : null,
    });
    setRemarksModalVisible(true);
  };

  const handleRemarksSave = async () => {
    try {
      const values = await form.validateFields();
      await updateReceivableInStorage(
        currentRecord.payoutId,
        {
          collection_remarks: values.collection_remarks || "",
          collection_last_followup: values.collection_last_followup
            ? values.collection_last_followup.format("YYYY-MM-DD")
            : "",
          collection_next_action: values.collection_next_action
            ? values.collection_next_action.format("YYYY-MM-DD")
            : "",
        },
        {
          action: "Follow-up Note Added",
          details: values.collection_remarks || "Updated follow-up dates",
        },
      );
      setRemarksModalVisible(false);
      message.success("Collection notes updated");
    } catch (err) {
      console.error("Remarks save failed:", err);
    }
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredRows.map((r) => ({
      "Payout ID": r.payoutId,
      "Loan ID": r.loanId,
      "Customer Name": r.customerName,
      "Bank/Party": r.payout_party_name,
      Type: r.payout_type,
      "Gross Amount": Number(r.payout_amount || 0),
      TDS: Number(r.tds_amount || 0),
      "Net Amount": Number(r.payout_amount || 0) - Number(r.tds_amount || 0),
      Status: r.payout_status || "Pending",
      Priority: r.priority || "Medium",
      "Days Pending":
        calculateDaysPending(r.payout_received_date, r.created_date) || "-",
      "Last Follow-up": r.collection_last_followup || "-",
      "Next Action": r.collection_next_action || "-",
      "Received Date": r.payout_received_date || "-",
      "Amount Received": r.actual_amount_received || "-",
      Remarks: r.collection_remarks || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");

    const fileName = `Collections_${dayjs().format("YYYY-MM-DD")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success("Data exported successfully");
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
        const hasFollowUpToday =
          r.collection_next_action &&
          dayjs(r.collection_next_action).isSame(dayjs(), "day");

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{r.customerName}</span>
              {hasFollowUpToday && (
                <Tooltip title="Follow-up due today">
                  <Badge dot>
                    <BellOutlined style={{ color: "#fa8c16" }} />
                  </Badge>
                </Tooltip>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Loan: {r.loanId}</div>
            <div className="text-xs text-muted-foreground/80 mt-0.5">ID: {r.payoutId}</div>
            {r.priority && r.priority !== "Medium" && (
              <Tag
                color={r.priority === "High" ? "red" : "default"}
                style={{ marginTop: 4, fontSize: 10 }}
              >
                {r.priority} Priority
              </Tag>
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
      width: 160,
      align: "right",
      render: (_, r) => {
        const gross = Number(r.payout_amount || 0);
        const tds = Number(r.tds_amount || 0);
        const net = gross - tds;
        const received = r.actual_amount_received || 0;
        const hasPartial = (r.payment_history || []).length > 0;

        return (
          <div>
            <div className="text-base font-semibold">{formatCurrency(net)}</div>
            {tds > 0 && (
              <div className="text-xs text-muted-foreground">
                TDS: {formatCurrency(tds)}
              </div>
            )}
            {hasPartial && (
              <div className="text-xs text-primary mt-1">
                Received: {formatCurrency(received)}
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
        if (r.payout_status === "Received") {
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
      dataIndex: "payout_status",
      width: 160,
      render: (v, r) => (
        <Select
          value={v || "Pending"}
          style={{ width: "100%" }}
          onChange={(val) =>
            updateReceivableInStorage(
              r.payoutId,
              {
                payout_status: val,
                payout_received_date:
                  val === "Received"
                    ? r.payout_received_date || dayjs().format("YYYY-MM-DD")
                    : "",
              },
              {
                action: "Status Changed",
                details: `Changed to ${val}`,
              },
            )
          }
        >
          <Option value="Pending">
            <ClockCircleOutlined style={{ color: "#1890ff" }} /> Pending
          </Option>
          <Option value="Partial">
            <ClockCircleOutlined style={{ color: "#faad14" }} /> Partial
          </Option>
          <Option value="Received">
            <CheckCircleOutlined style={{ color: "#52c41a" }} /> Received
          </Option>
          <Option value="Hold">
            <PauseCircleOutlined style={{ color: "#fa8c16" }} /> On Hold
          </Option>
        </Select>
      ),
    },
    {
      title: "Received Date",
      dataIndex: "payout_received_date",
      width: 140,
      render: (v, r) => (
        <DatePicker
          size="small"
          value={v ? dayjs(v) : null}
          onChange={(date, dateString) =>
            updateReceivableInStorage(
              r.payoutId,
              {
                payout_received_date: dateString,
                payout_status: dateString ? "Received" : r.payout_status,
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
        />
      ),
    },
    {
      title: "Actions",
      width: 160,
      align: "center",
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="Collection notes">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => openRemarksModal(r)}
            >
              {r.collection_remarks && <Badge dot />}
            </Button>
          </Tooltip>
          <Tooltip title="Activity timeline">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => openTimelineModal(r)}
            >
              {(r.activity_log || []).length > 0 && (
                <Badge count={(r.activity_log || []).length} />
              )}
            </Button>
          </Tooltip>
          {r.payout_status !== "Received" && (
            <Tooltip title="Record payment">
              <Button
                type="text"
                icon={<DollarOutlined />}
                onClick={() => openPartialPaymentModal(r)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  /* ==============================
     Bulk Actions Menu
  ============================== */
  const bulkActionsMenu = (
    <Menu>
      <Menu.Item
        key="collected"
        icon={<CheckCircleOutlined />}
        onClick={openBulkCollectionModal}
      >
        Mark as Collected
      </Menu.Item>
      <Menu.Item key="edit" icon={<EditOutlined />} onClick={handleBulkEdit}>
        Bulk Edit
      </Menu.Item>
    </Menu>
  );

  /* ==============================
     Render
  ============================== */
  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">
              Receivables
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage receivables and track collections
            </p>
          </div>
          <Space size="small">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadReceivables}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 ${stat.iconColor}`}>
                {stat.badge ? <Badge dot>{stat.icon}</Badge> : stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground truncate">{stat.label}</div>
                <div className={`text-lg font-bold font-mono truncate ${stat.id === "total" || stat.id === "collected" || stat.id === "pending" ? stat.iconColor : "text-foreground"}`}>
                  {stat.value}
                </div>
                {stat.subtext && (
                  <div className="text-xs text-muted-foreground truncate">{stat.subtext}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bank Summary */}
        {bankSummary.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Bank-wise Pending Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {bankSummary.slice(0, 8).map((bank, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{bank.bank}</div>
                    <div className="text-xs text-muted-foreground">{bank.count} items</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-primary">{formatCurrency(bank.pending)}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(bank.collected)} ✓</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick View + Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Quick view:</span>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              size="small"
              value={quickView}
              onChange={(e) => setQuickView(e.target.value)}
              className="flex flex-wrap"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="due-today">Due Today</Radio.Button>
              <Radio.Button value="due-week">Due This Week</Radio.Button>
              <Radio.Button value="overdue">Overdue</Radio.Button>
              <Radio.Button value="critical">Critical (30+ days)</Radio.Button>
            </Radio.Group>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
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
              <Option value="Hold">On Hold</Option>
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
              value={amountRangeFilter}
              onChange={setAmountRangeFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Amounts</Option>
              <Option value="0-50k">₹0 - 50k</Option>
              <Option value="50k-1L">₹50k - 1 Lakh</Option>
              <Option value="1L-5L">₹1 - 5 Lakh</Option>
              <Option value="5L+">₹5 Lakh+</Option>
            </Select>
            <Select
              value={bankFilter}
              onChange={setBankFilter}
              size="large"
              className="w-full"
              showSearch
            >
              <Option value="All">All Banks</Option>
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
            amountRangeFilter !== "All" ||
            quickView !== "all") && (
            <div className="mt-3">
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter("All");
                  setBankFilter("All");
                  setSearchText("");
                  setAgeFilter("All");
                  setAmountRangeFilter("All");
                  setQuickView("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="bg-muted/30 border border-border rounded-xl p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">
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

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table
          rowKey={(r) => r.payoutId || r.id}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rowsSelected) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rowsSelected);
            },
            getCheckboxProps: (record) => ({
              disabled: record.payout_status === "Received",
            }),
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
          rowClassName={(record) => {
            if (record.priority === "High") return "bg-destructive/5";
            return "";
          }}
        />
      </div>

      {/* Modals */}
      
      {/* Bulk Collection Modal */}
      <Modal
        title="Mark as Collected"
        open={bulkCollectionModalVisible}
        onOk={handleBulkCollectionSave}
        onCancel={() => setBulkCollectionModalVisible(false)}
        width={500}
        okText="Confirm Collection"
      >
        <Form form={bulkForm} layout="vertical">
          <p className="mb-4 text-muted-foreground">
            You are marking <strong>{selectedRows.length}</strong> receivable(s)
            as collected.
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

          <Form.Item
            name="total_amount_received"
            label="Total Amount Received"
            rules={[
              { required: true, message: "Please enter amount received" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              prefix="₹"
              formatter={(value) => formatINRInput(value)}
              parser={(value) => parseINRInput(value)}
              size="large"
              min={0}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        title="Bulk Edit Receivables"
        open={bulkEditModalVisible}
        onOk={handleBulkEditSave}
        onCancel={() => setBulkEditModalVisible(false)}
        width={500}
        okText="Apply Changes"
      >
        <Form form={bulkEditForm} layout="vertical">
          <p className="mb-4 text-muted-foreground">
            Editing <strong>{selectedRows.length}</strong> receivable(s).
          </p>

          <Form.Item name="bulk_priority" label="Set Priority">
            <Radio.Group>
              <Radio value="High">High</Radio>
              <Radio value="Medium">Medium</Radio>
              <Radio value="Low">Low</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="bulk_next_action" label="Set Next Action Date">
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item
            name="bulk_remarks"
            label="Add Remarks (will append to existing)"
          >
            <TextArea rows={3} placeholder="Enter remarks to add..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Partial Payment Modal */}
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
            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Expected Amount</div>
              <div className="text-lg font-semibold text-foreground">
                {formatCurrency(
                  Number(currentRecord.payout_amount || 0) -
                    Number(currentRecord.tds_amount || 0),
                )}
              </div>
              {(currentRecord.payment_history || []).length > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  Already Received:{" "}
                  {formatCurrency(
                    (currentRecord.payment_history || []).reduce(
                      (sum, p) => sum + Number(p.amount || 0),
                      0,
                    ),
                  )}
                </div>
              )}
            </div>

            <Form.Item
              name="payment_amount"
              label="Payment Amount"
              rules={[
                { required: true, message: "Please enter payment amount" },
              ]}
            >
            <InputNumber
              style={{ width: "100%" }}
              prefix="₹"
              formatter={(value) => formatINRInput(value)}
              parser={(value) => parseINRInput(value)}
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

            <Form.Item name="payment_remarks" label="Remarks">
              <TextArea
                rows={2}
                placeholder="Payment method, reference number, etc."
              />
            </Form.Item>

            {(currentRecord.payment_history || []).length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">
                  Previous Payments:
                </div>
                {currentRecord.payment_history.map((p, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground mb-1">
                    • {formatCurrency(p.amount)} on{" "}
                    {dayjs(p.date).format("DD MMM YYYY")}
                    {p.remarks && ` - ${p.remarks}`}
                  </div>
                ))}
              </div>
            )}
          </Form>
        )}
      </Modal>

      {/* Activity Timeline Modal */}
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
            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="font-semibold text-foreground">{currentRecord.customerName}</div>
              <div className="text-sm text-muted-foreground">
                Payout ID: {currentRecord.payoutId}
              </div>
            </div>

            {(currentRecord.activity_log || []).length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No activity recorded yet
              </div>
            ) : (
              <Timeline
                items={(currentRecord.activity_log || [])
                  .reverse()
                  .map((log, idx) => ({
                    children: (
                      <div key={idx}>
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.details}
                        </div>
                        <div className="text-xs text-muted-foreground/80 mt-1">
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

      {/* Collection Notes Modal */}
      <Modal
        title="Collection Notes"
        open={remarksModalVisible}
        onOk={handleRemarksSave}
        onCancel={() => setRemarksModalVisible(false)}
        width={600}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="collection_last_followup"
            label="Last Follow-up Date"
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="collection_next_action" label="Next Action Date">
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="collection_remarks" label="Remarks / Notes">
            <TextArea
              rows={4}
              placeholder="Add collection notes, follow-up details, or payment commitments..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayoutReceivablesDashboard;
