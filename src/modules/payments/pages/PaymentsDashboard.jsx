import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AutoComplete,
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Modal,
  DatePicker,
  Select,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DownloadOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  SearchOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { paymentsApi } from "../../../api/payments";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";
import DirectCreateModal from "../../shared/DirectCreateModal";

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const normalizeLoanId = (value = "") => String(value || "").trim();

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const chunkArray = (arr = [], size = 250) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const dedupeDOByLoanId = (rows = []) => {
  const byLoanId = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeLoanId(row?.loanId || row?.do_loanId);
    if (!key) return;
    if (!byLoanId.has(key)) {
      byLoanId.set(key, row);
      return;
    }
    const prev = byLoanId.get(key);
    const prevTs =
      new Date(prev?.updatedAt || prev?.createdAt || 0).getTime() || 0;
    const nextTs = new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
    if (nextTs >= prevTs) byLoanId.set(key, row);
  });
  return Array.from(byLoanId.values());
};

const fetchAllByPagination = async (fetchPage, pageSize = 1000) => {
  let skip = 0;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const res = await fetchPage({ limit: pageSize, skip, noCount: true });
    const page = listFromResponse(res);
    all.push(...page);
    hasMore = Boolean(res?.hasMore);
    skip += pageSize;
  }

  return all;
};

const fetchLoansByIds = async (loanIds = []) => {
  const ids = Array.from(
    new Set((loanIds || []).map((id) => normalizeLoanId(id)).filter(Boolean)),
  );
  if (!ids.length) return [];

  const chunks = chunkArray(ids, 250);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      loansApi.getAll({
        loanIds: chunk.join(","),
        limit: 1000,
        noCount: true,
        view: "dashboard",
        sortBy: "leadDate",
        sortDir: "desc",
      }),
    ),
  );
  return payloads.flatMap((payload) => listFromResponse(payload));
};

const fetchPaymentsByLoanIds = async (loanIds = []) => {
  const ids = Array.from(
    new Set((loanIds || []).map((id) => normalizeLoanId(id)).filter(Boolean)),
  );
  if (!ids.length) return [];

  const chunks = chunkArray(ids, 250);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      paymentsApi.getAll({
        loanIds: chunk.join(","),
        limit: 1000,
        noCount: true,
      }),
    ),
  );

  return payloads.flatMap((payload) => listFromResponse(payload));
};

const PaymentsDashboard = () => {
  const navigate = useNavigate();
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();

  const [loans, setLoans] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [savedDOs, setSavedDOs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState(null); // "SHOWROOM" | "AC"
  const [activeLoanForModal, setActiveLoanForModal] = useState(null);

  const [modalPaymentType, setModalPaymentType] = useState("Margin Money");
  const [modalPaymentMadeBy, setModalPaymentMadeBy] = useState("Customer");
  const [modalPaymentMode, setModalPaymentMode] = useState("Online Transfer/UPI");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState(dayjs());
  const [modalBank, setModalBank] = useState("");
  const [modalTxn, setModalTxn] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(String(searchInput || "").trim());
    }, 220);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const resetModalState = () => {
    setPaymentModalMode(null);
    setActiveLoanForModal(null);
    setModalPaymentType("Margin Money");
    setModalPaymentMadeBy("Customer");
    setModalPaymentMode("Online Transfer/UPI");
    setModalAmount("");
    setModalDate(dayjs());
    setModalBank("");
    setModalTxn("");
    setModalRemarks("");
  };

  const openQuickAddModal = (loan, mode) => {
    setActiveLoanForModal(loan);
    setPaymentModalMode(mode);
    setShowPaymentModal(true);
  };

  const closeQuickAddModal = () => {
    setShowPaymentModal(false);
    resetModalState();
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const docs = dedupeDOByLoanId(
        await fetchAllByPagination((params) =>
          deliveryOrdersApi.getAll({
            ...params,
            ...(searchQuery ? { search: searchQuery } : {}),
          }),
        ),
      );

      const loanIds = docs
        .map((row) => normalizeLoanId(row?.loanId || row?.do_loanId))
        .filter(Boolean);

      const [loanRows, paymentRows] = await Promise.all([
        fetchLoansByIds(loanIds),
        fetchPaymentsByLoanIds(loanIds),
      ]);

      setSavedDOs(docs);
      setLoans(Array.isArray(loanRows) ? loanRows : []);
      setSavedPayments(Array.isArray(paymentRows) ? paymentRows : []);
    } catch (err) {
      console.error("Failed to load payments dashboard data:", err);
      setSavedDOs([]);
      setLoans([]);
      setSavedPayments([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loanMap = useMemo(() => {
    const map = new Map();
    (loans || []).forEach((loan) => {
      const key = normalizeLoanId(loan?.loanId || loan?._id);
      if (!key) return;
      map.set(key, loan);
    });
    return map;
  }, [loans]);

  const paymentMap = useMemo(() => {
    const map = new Map();
    (savedPayments || []).forEach((p) => {
      const key = normalizeLoanId(p?.loanId);
      if (!key) return;
      map.set(key, p);
    });
    return map;
  }, [savedPayments]);

  const rows = useMemo(() => {
    return (savedDOs || []).map((doRec) => {
      const loanId = normalizeLoanId(doRec?.loanId || doRec?.do_loanId);
      const loan = loanMap.get(loanId) || {};
      const payment = paymentMap.get(loanId) || {};

      const customerName =
        safeText(doRec?.do_customerName) ||
        safeText(doRec?.customerName) ||
        safeText(loan?.customerName) ||
        "Unknown";
      const primaryMobile =
        safeText(doRec?.do_primaryMobile) ||
        safeText(doRec?.primaryMobile) ||
        safeText(loan?.primaryMobile) ||
        "";

      const vehicle = [
        safeText(doRec?.do_vehicleMake || doRec?.vehicleMake || loan?.vehicleMake),
        safeText(doRec?.do_vehicleModel || doRec?.vehicleModel || loan?.vehicleModel),
        safeText(
          doRec?.do_vehicleVariant || doRec?.vehicleVariant || loan?.vehicleVariant,
        ),
      ]
        .filter(Boolean)
        .join(" ");

      const dealerName =
        safeText(doRec?.do_dealerName) ||
        safeText(doRec?.dealerName) ||
        safeText(loan?.showroomDealerName) ||
        safeText(loan?.delivery_dealerName) ||
        "Showroom not set";

      const doRef =
        safeText(doRec?.do_refNo) || safeText(doRec?.doNumber) || "";

      const netDO = asInt(doRec?.do_netDOAmount);

      const paidShowroom =
        asInt(payment?.entryTotals?.paymentAmountLoan) +
        asInt(payment?.entryTotals?.paymentAmountAutocredits) +
        asInt(payment?.entryTotals?.paymentAmountCustomer);

      const outstandingShowroom = netDO > 0 ? Math.max(0, netDO - paidShowroom) : 0;
      const receivedAutocredits = asInt(payment?.autocreditsTotals?.receiptAmountTotal);

      const showroomSettled = Boolean(payment?.isVerified) && outstandingShowroom === 0;
      const autocreditsSettled = Boolean(payment?.isAutocreditsVerified);

      let overallStatus = "DRAFT";
      if (showroomSettled && autocreditsSettled) overallStatus = "SETTLED";
      else if (showroomSettled || autocreditsSettled) overallStatus = "PARTIAL";
      else if (paidShowroom > 0 || receivedAutocredits > 0) overallStatus = "IN_PROGRESS";

      return {
        key: loanId,
        loanId,
        doRef,
        customerName,
        primaryMobile,
        dealerName,
        vehicle,
        netDO,
        paidShowroom,
        outstandingShowroom,
        receivedAutocredits,
        showroomSettled,
        autocreditsSettled,
        overallStatus,
        hasPayment: Boolean(payment?._id || payment?.loanId),
        payment,
        doRec,
      };
    });
  }, [savedDOs, loanMap, paymentMap]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    if (statusFilter === "OUTSTANDING")
      return rows.filter((row) => row.outstandingShowroom > 0 || !row.showroomSettled);
    if (statusFilter === "AC_PENDING")
      return rows.filter((row) => !row.autocreditsSettled);
    if (statusFilter === "SETTLED")
      return rows.filter((row) => row.showroomSettled && row.autocreditsSettled);
    if (statusFilter === "PARTIAL")
      return rows.filter((row) => row.overallStatus === "PARTIAL");
    return rows;
  }, [rows, statusFilter]);

  const totals = useMemo(() => {
    let totalPaidToShowroom = 0;
    let totalReceivedByAutocredits = 0;
    let totalOutstandingToShowroom = 0;
    let countShowroomPending = 0;
    let countAutocreditsPending = 0;
    let countFullySettled = 0;

    filteredRows.forEach((row) => {
      totalPaidToShowroom += asInt(row.paidShowroom);
      totalReceivedByAutocredits += asInt(row.receivedAutocredits);
      totalOutstandingToShowroom += asInt(row.outstandingShowroom);
      if (!row.showroomSettled) countShowroomPending += 1;
      if (!row.autocreditsSettled) countAutocreditsPending += 1;
      if (row.showroomSettled && row.autocreditsSettled) countFullySettled += 1;
    });

    return {
      totalPaidToShowroom,
      totalReceivedByAutocredits,
      totalOutstandingToShowroom,
      countShowroomPending,
      countAutocreditsPending,
      countFullySettled,
      totalCases: filteredRows.length,
    };
  }, [filteredRows]);

  const handleQuickAddSubmit = async () => {
    if (!activeLoanForModal || !paymentModalMode) return;

    const loanId = activeLoanForModal.loanId;
    const latest = await paymentsApi.getByLoanId(loanId);
    const existingSafe = latest?.data || { loanId };

    try {
      const currentShowroomRows = Array.isArray(existingSafe?.showroomRows)
        ? existingSafe.showroomRows
        : [];
      const currentAutocreditsRows = Array.isArray(existingSafe?.autocreditsRows)
        ? existingSafe.autocreditsRows
        : [];

      const isoDate = modalDate ? modalDate.toISOString() : null;

      const payload = {
        ...existingSafe,
        loanId,
      };

      if (paymentModalMode === "SHOWROOM") {
        const newRow = {
          id: `dash-showroom-${Date.now()}`,
          paymentType: modalPaymentType,
          paymentMadeBy: modalPaymentMadeBy,
          paymentMode: modalPaymentMode,
          paymentAmount: modalAmount,
          paymentDate: isoDate,
          transactionDetails: modalTxn,
          bankName: modalBank,
          remarks: modalRemarks || "Dashboard added payment",
          _auto: false,
        };

        payload.showroomRows = [...currentShowroomRows, newRow];
      } else if (paymentModalMode === "AC") {
        const newRow = {
          id: `dash-ac-${Date.now()}`,
          receiptTypes: ["Margin Money"],
          receiptMode: modalPaymentMode,
          receiptAmount: modalAmount,
          receiptDate: isoDate,
          transactionDetails: modalTxn,
          bankName: modalBank,
          remarks: modalRemarks || "Dashboard added receipt",
        };

        payload.autocreditsRows = [...currentAutocreditsRows, newRow];
      }

      await paymentsApi.update(loanId, payload);
      await loadData();
      closeQuickAddModal();
    } catch (err) {
      console.error("Quick add payment error:", err);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Case",
        key: "case",
        width: 280,
        fixed: "left",
        render: (_, row) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-foreground">{row.loanId}</span>
              {row.doRef && (
                <Tag color="default" style={{ fontSize: 10 }}>
                  DO: {row.doRef}
                </Tag>
              )}
            </div>
            <span className="text-[12px] text-foreground">{row.customerName || "—"}</span>
            <span className="text-[11px] text-muted-foreground">{row.primaryMobile || "—"}</span>
            <span className="text-[11px] text-muted-foreground">{row.vehicle || "—"}</span>
          </div>
        ),
      },
      {
        title: "Showroom",
        key: "showroom",
        width: 300,
        render: (_, row) => {
          const settled = row.showroomSettled;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-foreground">{row.dealerName}</span>
              <span className="text-[11px] text-muted-foreground">
                Net {money(row.netDO)} · <span className="text-emerald-600">{money(row.paidShowroom)}</span> paid ·{" "}
                <span className={row.outstandingShowroom > 0 ? "text-rose-600" : "text-muted-foreground"}>
                  {money(row.outstandingShowroom)} out
                </span>
              </span>
              <Tag color={settled ? "success" : "error"} style={{ width: "fit-content", fontSize: 11 }}>
                Showroom {settled ? "settled" : "pending"}
              </Tag>
            </div>
          );
        },
      },
      {
        title: "Autocredits",
        key: "autocredits",
        width: 220,
        render: (_, row) => {
          const receiptsCount = Array.isArray(row?.payment?.autocreditsRows)
            ? row.payment.autocreditsRows.length
            : 0;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{receiptsCount} receipts</span>
              <span className="text-[12px] text-foreground">
                {row.receivedAutocredits > 0 ? money(row.receivedAutocredits) : "—"}
              </span>
              <Tag
                color={row.autocreditsSettled ? "processing" : "error"}
                style={{ width: "fit-content", fontSize: 11 }}
              >
                Autocredits {row.autocreditsSettled ? "settled" : "pending"}
              </Tag>
            </div>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        width: 150,
        render: (_, row) => {
          const meta = {
            DRAFT: { label: "Draft", color: "default" },
            IN_PROGRESS: { label: "In progress", color: "warning" },
            PARTIAL: { label: "Partial", color: "gold" },
            SETTLED: { label: "Settled", color: "success" },
          };
          const conf = meta[row.overallStatus] || meta.DRAFT;
          return <Tag color={conf.color}>{conf.label}</Tag>;
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 300,
        fixed: "right",
        render: (_, row) => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {row.hasPayment ? (
                <>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/payments/${row.loanId}`)}
                  >
                    Open
                  </Button>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/payments/${row.loanId}?view=1`)}
                  >
                    View
                  </Button>
                </>
              ) : (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/payments/${row.loanId}`)}
                >
                  Create
                </Button>
              )}
            </div>

            {row.hasPayment && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => openQuickAddModal(row, "SHOWROOM")}
                >
                  Add payment
                </Button>
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => openQuickAddModal(row, "AC")}
                >
                  Add receipt
                </Button>
              </div>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  );

  const stats = [
    {
      id: "cases",
      label: "Cases",
      value: totals.totalCases,
      sub: "Available DO-linked cases",
      icon: <CarOutlined className="text-sky-600" />,
    },
    {
      id: "paid",
      label: "Paid to Showroom",
      value: money(totals.totalPaidToShowroom),
      sub: `${totals.countShowroomPending} showroom pending`,
      icon: <DollarOutlined className="text-emerald-600" />,
    },
    {
      id: "out",
      label: "Outstanding",
      value: money(totals.totalOutstandingToShowroom),
      sub: `${totals.countShowroomPending} pending`,
      icon: <HourglassOutlined className="text-amber-600" />,
    },
    {
      id: "ac",
      label: "AC Receipts",
      value: money(totals.totalReceivedByAutocredits),
      sub: `${totals.countAutocreditsPending} AC pending`,
      icon: <CheckCircleOutlined className="text-indigo-600" />,
    },
    {
      id: "settled",
      label: "Fully Settled",
      value: totals.countFullySettled,
      sub: "Showroom + AC verified",
      icon: <CheckCircleOutlined className="text-green-600" />,
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <Card
        className="rounded-2xl mb-4 bg-card border border-border"
        styles={{ body: { padding: 18 } }}
      >
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">
              Payments Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Fresh payment workspace for all available delivery orders
            </p>
          </div>
          <Space size="small" wrap>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
              New Payment
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div key={stat.id} className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-card">{stat.icon}</div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground truncate">{stat.label}</div>
                <div className="text-lg font-bold font-mono truncate text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground truncate">{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl mb-4 bg-card border border-border" styles={{ body: { padding: 14 } }}>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Button
              size="small"
              type={statusFilter === "ALL" ? "primary" : "default"}
              onClick={() => setStatusFilter("ALL")}
            >
              All
            </Button>
            <Button
              size="small"
              type={statusFilter === "OUTSTANDING" ? "primary" : "default"}
              onClick={() => setStatusFilter("OUTSTANDING")}
            >
              Outstanding
            </Button>
            <Button
              size="small"
              type={statusFilter === "AC_PENDING" ? "primary" : "default"}
              onClick={() => setStatusFilter("AC_PENDING")}
            >
              AC Pending
            </Button>
            <Button
              size="small"
              type={statusFilter === "PARTIAL" ? "primary" : "default"}
              onClick={() => setStatusFilter("PARTIAL")}
            >
              Partial
            </Button>
            <Button
              size="small"
              type={statusFilter === "SETTLED" ? "primary" : "default"}
              onClick={() => setStatusFilter("SETTLED")}
            >
              Settled
            </Button>
          </div>

          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search (backend): Loan ID, DO, customer, mobile, vehicle, dealer"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ maxWidth: 520 }}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {loading ? "Loading payments..." : `${filteredRows.length} cases in current result`}
        </div>
      </Card>

      <Card className="rounded-2xl bg-card border border-border" styles={{ body: { padding: 0 } }}>
        {filteredRows.length === 0 && !loading ? (
          <div className="py-16">
            <Empty description="No payment cases found" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRows}
            pagination={false}
            size="middle"
            scroll={{ y: 620, x: 1250 }}
            rowKey="loanId"
            loading={loading}
            virtual
          />
        )}
      </Card>

      <Modal
        open={showPaymentModal}
        title={
          paymentModalMode === "SHOWROOM"
            ? "Add payment to showroom"
            : "Add receipt at Autocredits"
        }
        onCancel={closeQuickAddModal}
        onOk={handleQuickAddSubmit}
        okText="Save"
        centered
        destroyOnHidden
      >
        <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
          <div className="text-xs text-muted-foreground">
            {activeLoanForModal && (
              <>
                Loan <span className="font-semibold text-foreground">{activeLoanForModal.loanId}</span> ·{" "}
                {activeLoanForModal.customerName || "Customer"}
              </>
            )}
          </div>

          {paymentModalMode === "SHOWROOM" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Payment type</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentType}
                      onChange={setModalPaymentType}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        { value: "Margin Money", label: "Margin Money" },
                        { value: "Loan", label: "Loan" },
                        { value: "Exchange Vehicle", label: "Exchange Vehicle" },
                        { value: "Insurance", label: "Insurance" },
                        { value: "Commission", label: "Commission" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Payment made by</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentMadeBy}
                      onChange={setModalPaymentMadeBy}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        { value: "Customer", label: "Customer" },
                        { value: "Autocredits", label: "Autocredits" },
                        { value: "Bank", label: "Bank" },
                        { value: "Showroom", label: "Showroom" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Payment mode</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentMode}
                      onChange={setModalPaymentMode}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        { value: "Online Transfer/UPI", label: "Online Transfer/UPI" },
                        { value: "Cash", label: "Cash" },
                        { value: "Cheque", label: "Cheque" },
                        { value: "DD", label: "DD" },
                        { value: "Credit Card", label: "Credit Card" },
                        { value: "Adjustment", label: "Adjustment" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Payment amount</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      placeholder="Amount"
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Payment date</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <DatePicker
                      value={modalDate}
                      onChange={(d) => setModalDate(d || dayjs())}
                      style={{ width: "100%" }}
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Transaction details</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalTxn}
                      onChange={(e) => setModalTxn(e.target.value)}
                      placeholder="Txn / UTR / Ref"
                      bordered={false}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Bank name</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <AutoComplete
                      value={modalBank}
                      options={bankDirectoryOptions}
                      onChange={(value) => setModalBank(value)}
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(String(inputValue || "").toUpperCase())
                      }
                      placeholder="Bank"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Remarks</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalRemarks}
                      onChange={(e) => setModalRemarks(e.target.value)}
                      placeholder="Remarks"
                      bordered={false}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {paymentModalMode === "AC" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Receipt mode</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentMode}
                      onChange={setModalPaymentMode}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        { value: "Online Transfer/UPI", label: "Online Transfer/UPI" },
                        { value: "Cash", label: "Cash" },
                        { value: "Cheque", label: "Cheque" },
                        { value: "DD", label: "DD" },
                        { value: "Credit Card", label: "Credit Card" },
                        { value: "Adjustment", label: "Adjustment" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Receipt amount</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      placeholder="Amount"
                      bordered={false}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Receipt date</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <DatePicker
                      value={modalDate}
                      onChange={(d) => setModalDate(d || dayjs())}
                      style={{ width: "100%" }}
                      bordered={false}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Transaction details</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalTxn}
                      onChange={(e) => setModalTxn(e.target.value)}
                      placeholder="Txn / UTR / Ref"
                      bordered={false}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Bank name</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <AutoComplete
                      value={modalBank}
                      options={bankDirectoryOptions}
                      onChange={(value) => setModalBank(value)}
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(String(inputValue || "").toUpperCase())
                      }
                      placeholder="Bank"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Remarks</div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Input
                      value={modalRemarks}
                      onChange={(e) => setModalRemarks(e.target.value)}
                      placeholder="Remarks"
                      bordered={false}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <DirectCreateModal
        open={showCreateModal}
        mode="PAYMENT"
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
};

export default PaymentsDashboard;
