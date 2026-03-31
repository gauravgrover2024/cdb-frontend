// src/modules/payments/pages/PaymentsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Typography,
  Modal,
  DatePicker,
  Select,
  Collapse,
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
  ArrowRightOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { paymentsApi } from "../../../api/payments";
import { bookingsApi } from "../../../api/bookings";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";
import DirectCreateModal from "../../shared/DirectCreateModal";

const { Text } = Typography;
const { Panel } = Collapse;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const PaymentsDashboard = () => {
  const navigate = useNavigate();
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();

  const [loans, setLoans] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [savedDOs, setSavedDOs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  // Quick-add modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState(null); // "SHOWROOM" | "AC"
  const [activeLoanForModal, setActiveLoanForModal] = useState(null);

  // ACTIVE | ALL (for loans)
  const [viewMode, setViewMode] = useState("ACTIVE");
  const [cardFilter, setCardFilter] = useState("ALL");

  const [totals, setTotals] = useState({
    totalPaidToShowroom: 0,
    totalReceivedByAutocredits: 0,
    totalOutstandingToShowroom: 0,
    countShowroomPending: 0,
    countAutocreditsPending: 0,
    countFullySettled: 0,
  });

  console.log("BOOKINGS API OBJECT:", bookingsApi);

  const [activeLoans, setActiveLoans] = useState([]);

  const [modalPaymentType, setModalPaymentType] = useState("Margin Money");
  const [modalPaymentMadeBy, setModalPaymentMadeBy] = useState("Customer");
  const [modalPaymentMode, setModalPaymentMode] = useState(
    "Online Transfer/UPI",
  );
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState(dayjs());
  const [modalBank, setModalBank] = useState("");
  const [modalTxn, setModalTxn] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");

  // NEW: bookings view + pills state
  const [entityView, setEntityView] = useState("PAYMENTS"); // PAYMENTS | BOOKINGS
  const [bookingStatusFilter, setBookingStatusFilter] = useState("OPEN"); // OPEN | CANCELLED | MERGED | ALL
  // state
  const [bookings, setBookings] = useState([]);

  // loader
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const res = await bookingsApi.list({ limit: 200, skip: 0 });
        console.log("BOOKINGS API RAW FULL RESPONSE:", res);

        // res IS the array
        const raw = Array.isArray(res) ? res : [];
        console.log("BOOKINGS RAW ARRAY:", raw);

        setBookings(raw);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        setBookings([]);
      }
    };

    loadBookings();
  }, []);

  useEffect(() => {
    console.log("BOOKINGS STATE:", bookings);
  }, [bookings]);

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

  const loadData = async () => {
    if (loading) return;
    const startedAt = performance.now();
    console.log("[PaymentsDashboard] loadData START");

    setLoading(true);
    try {
      const t0 = performance.now();
      const [loansRes, dosRes, paymentsRes] = await Promise.all([
        loansApi.getAll("?limit=4000&skip=0"),
        deliveryOrdersApi.getAll(),
        paymentsApi.getAll(),
      ]);

      console.log("[PaymentsDashboard] loansRes", loansRes);
      console.log("[PaymentsDashboard] dosRes", dosRes);
      console.log("[PaymentsDashboard] paymentsRes", paymentsRes);

      const t1 = performance.now();

      console.log(
        "[PaymentsDashboard] paymentMap built in",
        (t1 - t0).toFixed(0),
        "ms for",
        savedPayments.length,
        "payments",
      );
      console.log("[PaymentsDashboard] loans:", loansRes?.data?.length || 0);
      console.log("[PaymentsDashboard] DOs:", dosRes?.data?.length || 0);
      console.log(
        "[PaymentsDashboard] payments:",
        paymentsRes?.data?.length || 0,
      );

      setLoans(loansRes?.data || []);
      setSavedDOs(dosRes?.data || []);
      setSavedPayments(paymentsRes?.data || []);

      const endedAt = performance.now();
      console.log(
        "[PaymentsDashboard] loadData TOTAL time",
        (endedAt - startedAt).toFixed(0),
        "ms",
      );
    } catch (err) {
      console.error("Failed to load payments dashboard data:", err);
      setLoans([]);
      setSavedPayments([]);
      setSavedDOs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Map payments by loanId
  const paymentMap = useMemo(() => {
    const map = {};

    (savedPayments || []).forEach((p) => {
      if (!p?.loanId) return;

      if (!map[p.loanId]) {
        map[p.loanId] = {
          entryTotals: {
            paymentAmountLoan: 0,
            paymentAmountAutocredits: 0,
            paymentAmountCustomer: 0,
          },
          autocreditsTotals: {
            receiptAmountTotal: 0,
          },
          showroomRows: [],
          autocreditsRows: [],
          isVerified: false,
          isAutocreditsVerified: false,
        };
      }

      const agg = map[p.loanId];

      agg.entryTotals.paymentAmountLoan += asInt(
        p?.entryTotals?.paymentAmountLoan,
      );
      agg.entryTotals.paymentAmountAutocredits += asInt(
        p?.entryTotals?.paymentAmountAutocredits,
      );
      agg.entryTotals.paymentAmountCustomer += asInt(
        p?.entryTotals?.paymentAmountCustomer,
      );

      agg.autocreditsTotals.receiptAmountTotal += asInt(
        p?.autocreditsTotals?.receiptAmountTotal,
      );

      agg.showroomRows.push(...(p.showroomRows || []));
      agg.autocreditsRows.push(...(p.autocreditsRows || []));

      agg.isVerified = agg.isVerified || p.isVerified;
      agg.isAutocreditsVerified =
        agg.isAutocreditsVerified || p.isAutocreditsVerified;
    });

    return map;
  }, [savedPayments]);

  // Map DO by loanId / do_loanId
  const doMap = useMemo(() => {
    const map = {};
    (savedDOs || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d;
    });
    return map;
  }, [savedDOs]);

  // Per-loan derived status
  const loanStatusMap = useMemo(() => {
    const result = {};
    (loans || []).forEach((loan) => {
      const loanId = loan?.loanId;
      const d = doMap[loanId];
      const p = paymentMap[loanId];

      const netDO = asInt(d?.do_netDOAmount);
      const paidShowroom =
        asInt(p?.entryTotals?.paymentAmountLoan || 0) +
        asInt(p?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(p?.entryTotals?.paymentAmountCustomer || 0);
      const outstandingShowroom =
        netDO > 0 ? Math.max(0, netDO - paidShowroom) : 0;

      const receivedAutocredits = asInt(
        p?.autocreditsTotals?.receiptAmountTotal || 0,
      );

      const showroomVerified = !!p?.isVerified;
      const autocreditsVerified = !!p?.isAutocreditsVerified;

      const showroomSettled = showroomVerified && outstandingShowroom === 0;
      const autocreditsSettled = autocreditsVerified;

      let overallStatus = "DRAFT";
      if (showroomSettled && autocreditsSettled) {
        overallStatus = "SETTLED";
      } else if (showroomSettled || autocreditsSettled) {
        overallStatus = "PARTIAL";
      }

      result[loanId] = {
        showroomSettled,
        autocreditsSettled,
        showroomVerified,
        autocreditsVerified,
        outstandingShowroom,
        receivedAutocredits,
        overallStatus,
        netDO,
        paidShowroom,
      };
    });
    return result;
  }, [loans, doMap, paymentMap]);

  useEffect(() => {
    if (!loans.length) return;

    let totalPaidToShowroom = 0;
    let totalReceivedByAutocredits = 0;
    let totalOutstandingToShowroom = 0;
    let countShowroomPending = 0;
    let countAutocreditsPending = 0;
    let countFullySettled = 0;

    Object.values(paymentMap).forEach((p) => {
      totalPaidToShowroom +=
        asInt(p.entryTotals?.paymentAmountLoan) +
        asInt(p.entryTotals?.paymentAmountAutocredits) +
        asInt(p.entryTotals?.paymentAmountCustomer);

      totalReceivedByAutocredits += asInt(
        p.autocreditsTotals?.receiptAmountTotal,
      );
    });

    loans.forEach((loan) => {
      const loanId = loan?.loanId;
      const d = doMap[loanId];
      const p = paymentMap[loanId] || {};

      const netDo = asInt(d?.do_netDOAmount);
      const paidToShowroom =
        asInt(p.entryTotals?.paymentAmountLoan) +
        asInt(p.entryTotals?.paymentAmountAutocredits) +
        asInt(p.entryTotals?.paymentAmountCustomer);

      if (netDo > 0) {
        const outstanding = Math.max(0, netDo - paidToShowroom);
        totalOutstandingToShowroom += outstanding;
      }

      const s = loanStatusMap[loanId] || {};
      if (!s.showroomSettled) countShowroomPending++;
      if (!s.autocreditsSettled) countAutocreditsPending++;
      if (s.showroomSettled && s.autocreditsSettled) countFullySettled++;
    });

    setTotals({
      totalPaidToShowroom,
      totalReceivedByAutocredits,
      totalOutstandingToShowroom,
      countShowroomPending,
      countAutocreditsPending,
      countFullySettled,
    });
  }, [loans, paymentMap, doMap, loanStatusMap]);

  useEffect(() => {
    if (!loans.length) return;

    const activeIds = new Set([
      ...Object.keys(paymentMap),
      ...Object.keys(doMap),
    ]);

    const computed = loans.filter((loan) => activeIds.has(loan.loanId));

    setActiveLoans(computed);
  }, [loans, paymentMap, doMap]);

  // Search (loans)
  const searchedLoans = useMemo(() => {
    const s = search.trim().toLowerCase();
    const baseLoans = viewMode === "ACTIVE" ? activeLoans : loans;

    if (!s) return baseLoans;

    return baseLoans.filter((l) => {
      const vehicle = `${safeText(l.vehicleMake)} ${safeText(
        l.vehicleModel,
      )} ${safeText(l.vehicleVariant)}`.trim();

      return (
        safeText(l.loanId).toLowerCase().includes(s) ||
        safeText(l.customerName).toLowerCase().includes(s) ||
        vehicle.toLowerCase().includes(s) ||
        safeText(l.recordSource).toLowerCase().includes(s) ||
        safeText(l.sourceName).toLowerCase().includes(s)
      );
    });
  }, [viewMode, activeLoans, loans, search]);

  const filteredLoans = useMemo(() => {
    if (cardFilter === "ALL") return searchedLoans;

    return searchedLoans.filter((loan) => {
      const s = loanStatusMap[loan.loanId] || {};

      if (cardFilter === "PAID") {
        return (s.paidShowroom || 0) > 0;
      }

      if (cardFilter === "OUTSTANDING") {
        return !s.showroomSettled;
      }

      if (cardFilter === "AC_PENDING") {
        return !s.autocreditsSettled;
      }

      if (cardFilter === "SETTLED") {
        return s.showroomSettled && s.autocreditsSettled;
      }

      return true;
    });
  }, [searchedLoans, cardFilter, loanStatusMap]);

  // bookings: simple client-side filter
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingStatusFilter === "ALL") return true;
      const st = safeText(b.status).toUpperCase(); // "OPEN"
      if (bookingStatusFilter === "OPEN") return st === "OPEN";
      if (bookingStatusFilter === "CANCELLED") return st === "CANCELLED";
      if (bookingStatusFilter === "MERGED") return st === "MERGED";
      return true;
    });
  }, [bookings, bookingStatusFilter]);

  // Top showrooms
  const topShowrooms = useMemo(() => {
    const byShowroom = {};

    (loans || []).forEach((loan) => {
      const loanId = loan?.loanId;
      const d = doMap[loanId];
      const p = paymentMap[loanId];
      if (!d) return;

      const dealerName =
        d?.do_dealerName || d?.dealerName || "Unknown Showroom";

      const net = asInt(d?.do_netDOAmount);
      const paid =
        asInt(p?.entryTotals?.paymentAmountLoan || 0) +
        asInt(p?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(p?.entryTotals?.paymentAmountCustomer || 0);
      const outstanding = net > 0 ? Math.max(0, net - paid) : 0;

      if (!byShowroom[dealerName]) {
        byShowroom[dealerName] = {
          showroom: dealerName,
          cases: 0,
          outstanding: 0,
        };
      }

      byShowroom[dealerName].cases += 1;
      byShowroom[dealerName].outstanding += outstanding;
    });

    return Object.values(byShowroom)
      .filter((x) => x.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 3);
  }, [loans, doMap, paymentMap]);

  // Top customers
  const topCustomers = useMemo(() => {
    const byCustomer = {};

    (loans || []).forEach((loan) => {
      const loanId = loan?.loanId;
      const name = safeText(loan?.customerName) || "Unknown Customer";
      const d = doMap[loanId];
      const p = paymentMap[loanId];

      const net = asInt(d?.do_netDOAmount);
      const paid =
        asInt(p?.entryTotals?.paymentAmountLoan || 0) +
        asInt(p?.entryTotals?.paymentAmountAutocredits || 0) +
        asInt(p?.entryTotals?.paymentAmountCustomer || 0);
      const outstanding = net > 0 ? Math.max(0, net - paid) : 0;
      const receivedAC = asInt(p?.autocreditsTotals?.receiptAmountTotal || 0);

      if (!byCustomer[name]) {
        byCustomer[name] = {
          customer: name,
          cases: 0,
          outstanding: 0,
          acReceipts: 0,
        };
      }

      byCustomer[name].cases += 1;
      byCustomer[name].outstanding += outstanding;
      byCustomer[name].acReceipts += receivedAC;
    });

    return Object.values(byCustomer)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 3);
  }, [loans, doMap, paymentMap]);

  // Handle quick-add submit
  const handleQuickAddSubmit = async () => {
    if (!activeLoanForModal || !paymentModalMode) return;

    const loanId = activeLoanForModal.loanId;
    const existing = paymentMap[loanId] || {};

    const latest = await paymentsApi.getByLoanId(loanId);
    const existingSafe = latest?.data || {};

    try {
      const currentShowroomRows = Array.isArray(existing.showroomRows)
        ? existing.showroomRows
        : [];
      const currentAutocreditsRows = Array.isArray(existing.autocreditsRows)
        ? existing.autocreditsRows
        : [];

      const isoDate = modalDate ? modalDate.toISOString() : null;

      let payload = { ...existingSafe, loanId };

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

  // Table columns (loans)
  const columns = useMemo(
    () => [
      {
        title: "Case",
        key: "case",
        width: 260,
        fixed: "left",
        render: (_, loan) => {
          const doRec = doMap[loan.loanId];
          const doRef = safeText(
            doRec?.do_refNo ||
              doRec?.doRefNo ||
              doRec?.refNo ||
              doRec?.ref_no ||
              "",
          );
          const vehicle = `${safeText(loan.vehicleMake)} ${safeText(
            loan.vehicleModel,
          )} ${safeText(loan.vehicleVariant)}`.trim();
          const sourceLine = [
            safeText(loan.recordSource),
            safeText(loan.sourceName),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  {loan.loanId}
                </span>
                {doRef && (
                  <Tag color="default" style={{ fontSize: 10 }}>
                    DO: {doRef}
                  </Tag>
                )}
              </div>
              <span className="text-[12px] text-foreground">
                {safeText(loan.customerName) || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {vehicle || "—"}
              </span>
              {sourceLine && (
                <span className="text-[10px] text-muted-foreground">
                  {sourceLine}
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: "Showroom",
        key: "showroom",
        width: 260,
        render: (_, loan) => {
          const d = doMap[loan.loanId];
          const s = loanStatusMap[loan.loanId] || {};
          const dealerName =
            d?.do_dealerName || d?.dealerName || "Showroom not set";

          const net = s.netDO || 0;
          const paid = s.paidShowroom || 0;
          const outstanding = s.outstandingShowroom || 0;

          const pillStyle = {
            borderRadius: 999,
            backgroundColor: s.showroomSettled ? "#dcfce7" : "#fee2e2",
            color: s.showroomSettled ? "#166534" : "#b91c1c",
            padding: "4px 12px",
            fontSize: 11,
            display: "inline-flex",
            width: "fit-content",
            alignItems: "center",
            height: 24,
            justifyContent: "center",
            lineHeight: "1",
            whiteSpace: "nowrap",
            border: "1px solid " + (s.showroomSettled ? "#bbf7d0" : "#fecaca"),
          };

          return (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-foreground">
                {dealerName}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Net {money(net)} ·{" "}
                <span className="text-emerald-600">{money(paid)}</span> paid ·{" "}
                <span
                  className={
                    outstanding > 0 ? "text-rose-600" : "text-muted-foreground"
                  }
                >
                  {money(outstanding)} out
                </span>
              </span>
              <span style={pillStyle}>
                Showroom {s.showroomSettled ? "settled" : "pending"}
              </span>
            </div>
          );
        },
      },
      {
        title: "Autocredits",
        key: "autocredits",
        width: 240,
        render: (_, loan) => {
          const p = paymentMap[loan.loanId];
          const s = loanStatusMap[loan.loanId] || {};
          const received = s.receivedAutocredits || 0;

          const isVerifiedShowroom = !!p?.isVerified;
          const isAutocreditsVerified = !!p?.isAutocreditsVerified;

          const receiptsCount = Array.isArray(p?.autocreditsRows)
            ? p.autocreditsRows.length
            : 0;

          const pillStyle = {
            borderRadius: 999,
            backgroundColor: s.autocreditsSettled ? "#ddd6fe" : "#fee2e2",
            color: s.autocreditsSettled ? "#4c1d95" : "#b91c1c",
            padding: "4px 12px",
            fontSize: 11,
            display: "inline-flex",
            width: "fit-content",
            justifyContent: "center",
            lineHeight: "1",
            whiteSpace: "nowrap",
            alignItems: "center",
            height: 24,
            border:
              "1px solid " + (s.autocreditsSettled ? "#ddd6fe" : "#fecaca"),
          };

          return (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                {receiptsCount} receipts from customer
              </span>
              <span className="text-[12px] text-foreground">
                {received > 0 ? money(received) : "—"}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {isVerifiedShowroom && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 border border-amber-200">
                    SR verified
                  </span>
                )}
                {isAutocreditsVerified && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 border border-purple-200">
                    AC verified
                  </span>
                )}
              </div>
              <span style={pillStyle}>
                Autocredits {s.autocreditsSettled ? "settled" : "pending"}
              </span>
            </div>
          );
        },
      },
      {
        title: "Activity",
        key: "activity",
        width: 170,
        render: (_, loan) => {
          const p = paymentMap[loan.loanId];
          const ts = p?.updatedAt || p?.createdAt;
          if (!ts)
            return <span className="text-[11px] text-muted-foreground">—</span>;

          const d = new Date(ts);
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                Last updated
              </span>
              <span className="text-[11px] text-muted-foreground">
                {d.toLocaleDateString("en-IN")}{" "}
                {d.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 260,
        fixed: "right",
        render: (_, loan) => {
          const p = paymentMap[loan.loanId];
          const exists = !!p;

          const status = loanStatusMap[loan.loanId] || {};
          const overall = status.overallStatus;

          let bg = "#e5e7eb";
          let color = "#374151";
          let border = "#d1d5db";
          let label = "Draft";

          if (overall === "SETTLED") {
            bg = "#dcfce7";
            color = "#166534";
            border = "#bbf7d0";
            label = "Fully settled";
          } else if (overall === "PARTIAL") {
            bg = "#fef3c7";
            color = "#92400e";
            border = "#fde68a";
            label = "Partially settled";
          }

          const pillStyle = {
            borderRadius: 999,
            backgroundColor: bg,
            color,
            padding: "4px 12px",
            fontSize: 11,
            display: "inline-flex",
            width: "fit-content",
            justifyContent: "center",
            lineHeight: "1",
            whiteSpace: "nowrap",
            alignItems: "center",
            height: 24,
            border: `1px solid ${border}`,
          };

          return (
            <div className="flex flex-col gap-2">
              <span style={pillStyle}>{label}</span>

              <div className="flex flex-wrap gap-2">
                {exists ? (
                  <>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/payments/${loan.loanId}`)}
                    >
                      Open
                    </Button>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() =>
                        navigate(`/payments/${loan.loanId}?view=1`)
                      }
                    >
                      View
                    </Button>
                  </>
                ) : (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => navigate(`/payments/${loan.loanId}`)}
                  >
                    Create
                  </Button>
                )}
              </div>

              {exists && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button
                    size="small"
                    type="default"
                    icon={<DollarOutlined />}
                    onClick={() => openQuickAddModal(loan, "SHOWROOM")}
                  >
                    Add payment
                  </Button>
                  <Button
                    size="small"
                    type="default"
                    icon={<CheckCircleOutlined />}
                    onClick={() => openQuickAddModal(loan, "AC")}
                  >
                    Add receipt
                  </Button>
                </div>
              )}
            </div>
          );
        },
      },
    ],
    [loanStatusMap, paymentMap, doMap, navigate],
  );

  const tableData = useMemo(
    () => filteredLoans.map((l) => ({ ...l, key: l.loanId })),
    [filteredLoans],
  );

  const stats = useMemo(
    () => [
      {
        id: "totalPaid",
        label: "Paid to showrooms",
        value: money(totals.totalPaidToShowroom),
        subtext: `${loans.length} cases`,
        icon: <DollarOutlined className="text-emerald-500" />,
      },
      {
        id: "outstanding",
        label: "Outstanding to showrooms",
        value: money(totals.totalOutstandingToShowroom),
        subtext: `${totals.countShowroomPending} cases`,
        icon: <HourglassOutlined className="text-amber-500" />,
      },
      {
        id: "totalAC",
        label: "Receipts at Autocredits",
        value: money(totals.totalReceivedByAutocredits),
        subtext: `${totals.countAutocreditsPending} AC pending`,
        icon: <CheckCircleOutlined className="text-indigo-500" />,
      },
      {
        id: "settled",
        label: "Fully settled cases",
        value: totals.countFullySettled,
        subtext: "Showroom + AC settled",
        icon: <CheckCircleOutlined className="text-emerald-500" />,
      },
      {
        id: "totalCases",
        label: "Total cases",
        value: loans.length,
        subtext: "In this dashboard",
        icon: <ArrowRightOutlined className="text-slate-500" />,
      },
    ],
    [totals, loans.length],
  );

  useEffect(() => {
    console.log("Loans:", loans.length);
    console.log("Table rows:", tableData.length);
  }, [loans, tableData]);

  // simple booking columns
  const bookingColumns = useMemo(
    () => [
      {
        title: "Booking",
        key: "booking",
        width: 260,
        fixed: "left",
        render: (_, b) => {
          const vehicle = `${safeText(b.vehicleMake)} ${safeText(
            b.vehicleModel,
          )} ${safeText(b.vehicleVariant)}`.trim();
          const status = safeText(b.status) || "Open";
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  {b.bookingId || b.id || "—"}
                </span>
                <Tag size="small" color="blue">
                  {status}
                </Tag>
              </div>
              <span className="text-[12px] text-foreground">
                {safeText(b.customerName) || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {safeText(b.customerPhone) || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {vehicle || "—"}
              </span>
            </div>
          );
        },
      },
      {
        title: "Showroom / City",
        key: "showroom",
        width: 220,
        render: (_, b) => (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">
              {safeText(b.showroomName) || "Showroom not set"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {safeText(b.regCity) || "City not set"}
            </span>
          </div>
        ),
      },
      {
        title: "Amounts",
        key: "amounts",
        width: 200,
        render: (_, b) => {
          const ex = asInt(b.exShowroomPrice || 0);
          const ba = asInt(b.bookingAmount || 0);
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                Ex-showroom {ex ? money(ex) : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Booking {ba ? money(ba) : "—"}
              </span>
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 200,
        fixed: "right",
        render: (_, b) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(`/payments/bookings/${b.bookingId || b._id}`)
              }
            >
              View
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() =>
                navigate(`/payments/bookings/edit/${b.bookingId || b._id}`)
              }
            >
              Edit booking
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      {/* HEADER + STATS */}
      <Card
        className="rounded-2xl mb-4 bg-card border border-border"
        bodyStyle={{ padding: 18 }}
      >
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">
              Payments
            </h1>
            <p className="text-sm text-muted-foreground">
              Showroom payouts and Autocredits receipts across all cases
            </p>
          </div>
          <Space size="small">
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={loadData}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              New Payment
            </Button>
            <Button
              icon={<FilterOutlined />}
              type={entityView === "BOOKINGS" ? "primary" : "default"}
              onClick={() =>
                setEntityView((prev) =>
                  prev === "BOOKINGS" ? "PAYMENTS" : "BOOKINGS",
                )
              }
            >
              {entityView === "BOOKINGS" ? "Bookings view" : "Payments view"}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/payments/new-booking")}
            >
              New booking
            </Button>
          </Space>
        </div>

        {entityView === "PAYMENTS" && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {stats.map((stat) => {
              let filterValue = "ALL";

              if (stat.id === "totalPaid") filterValue = "PAID";
              if (stat.id === "outstanding") filterValue = "OUTSTANDING";
              if (stat.id === "totalAC") filterValue = "AC_PENDING";
              if (stat.id === "settled") filterValue = "SETTLED";
              if (stat.id === "totalCases") filterValue = "ALL";

              const active = cardFilter === filterValue;

              return (
                <button
                  key={stat.id}
                  type="button"
                  onClick={() =>
                    setCardFilter((prev) =>
                      prev === filterValue ? "ALL" : filterValue,
                    )
                  }
                  className={`bg-background border rounded-xl p-3 flex items-center gap-3 w-full text-left
  transition-all duration-300 ease-out transform
  ${
    active
      ? "border-blue-500 ring-2 ring-blue-200 scale-[1.02] shadow-sm"
      : "border-border hover:border-sky-300 hover:scale-[1.01]"
  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-card shadow-none">
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-muted-foreground truncate">
                      {stat.label}
                    </div>
                    <div className="text-lg font-bold font-mono truncate text-foreground">
                      {stat.value}
                    </div>
                    {stat.subtext && (
                      <div className="text-xs text-muted-foreground truncate">
                        {stat.subtext}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* TOOLBAR: search + filters + analytics */}
      <Card
        className="rounded-2xl mb-4 bg-card border border-border"
        bodyStyle={{ padding: 14 }}
      >
        <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
          {entityView === "PAYMENTS" ? (
            <div className="flex items-center gap-2 mb-2">
              <Button
                size="small"
                type={viewMode === "ACTIVE" ? "primary" : "default"}
                onClick={() => setViewMode("ACTIVE")}
              >
                Active cases
              </Button>

              <Button
                size="small"
                type={viewMode === "ALL" ? "primary" : "default"}
                onClick={() => setViewMode("ALL")}
              >
                All loans
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-background rounded-full px-1 py-1">
              {[
                { id: "OPEN", label: "Open" },
                { id: "CANCELLED", label: "Cancelled" },
                { id: "MERGED", label: "Merged" },
                { id: "ALL", label: "All bookings" },
              ].map((pill) => {
                const active = bookingStatusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      active
                        ? "bg-[#111827] text-white shadow-sm"
                        : "bg-card text-[#4b5563]"
                    }`}
                    onClick={() => setBookingStatusFilter(pill.id)}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          )}

          <Input
            placeholder={
              entityView === "PAYMENTS"
                ? "Search by Loan ID / Customer / Vehicle / Source..."
                : "Search bookings (client-side later)..."
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ maxWidth: 420 }}
            allowClear
          />
        </div>

        {entityView === "PAYMENTS" && (
          <Collapse
            ghost
            bordered={false}
            defaultActiveKey={[]}
            expandIconPosition="end"
            style={{ background: "transparent" }}
          >
            <Panel
              header={
                <div className="text-xs font-medium text-muted-foreground">
                  Analytics · top showrooms & customers
                </div>
              }
              key="analytics"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                    Top showrooms by outstanding
                  </div>
                  {topShowrooms.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No outstanding amounts by showroom.
                    </Text>
                  ) : (
                    topShowrooms.map((s) => (
                      <div
                        key={s.showroom}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">
                            {s.showroom}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {s.cases} cases · {money(s.outstanding)} outstanding
                          </div>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => setSearch(s.showroom)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                    Top customers by outstanding
                  </div>
                  {topCustomers.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No outstanding amounts by customer.
                    </Text>
                  ) : (
                    topCustomers.map((c) => (
                      <div
                        key={c.customer}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">
                            {c.customer}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.cases} cases · {money(c.outstanding)} outstanding
                            · AC {money(c.acReceipts)}
                          </div>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => setSearch(c.customer)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>
          </Collapse>
        )}
      </Card>

      {entityView === "PAYMENTS" &&
        totals.totalOutstandingToShowroom > 5000000 && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ High outstanding detected —{" "}
            {money(totals.totalOutstandingToShowroom)}
          </div>
        )}

      {/* MAIN TABLE: payments or bookings */}
      {entityView === "PAYMENTS" ? (
        <Card
          className="rounded-2xl bg-card border border-border"
          bodyStyle={{ padding: 0 }}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Cases
              </div>
              <div className="text-[13px] text-muted-foreground">
                {tableData.length}
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            scroll={{ y: 600, x: 1200 }}
            rowKey="loanId"
            virtual
            loading={loading}
          />
        </Card>
      ) : (
        <Card
          className="rounded-2xl bg-card border border-border"
          bodyStyle={{ padding: 0 }}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Bookings
              </div>
              <div className="text-[13px] text-muted-foreground">
                {filteredBookings.length}
              </div>
            </div>
          </div>
          <Table
            columns={bookingColumns}
            dataSource={filteredBookings.map((b) => ({
              ...b,
              key: b.bookingId || b.id,
            }))}
            pagination={false}
            size="middle"
            scroll={{ y: 600, x: 1000 }}
            rowKey="key"
          />
        </Card>
      )}

      {/* QUICK-ADD MODAL */}
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
        destroyOnClose
      >
        <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
          <div className="text-xs text-muted-foreground">
            {activeLoanForModal && (
              <>
                Loan{" "}
                <span className="font-semibold text-foreground">
                  {activeLoanForModal.loanId}
                </span>{" "}
                · {activeLoanForModal.customerName || "Customer"}
              </>
            )}
          </div>

          {paymentModalMode === "SHOWROOM" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">
                    Payment type
                  </div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentType}
                      onChange={setModalPaymentType}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        { value: "Margin Money", label: "Margin Money" },
                        { value: "Loan", label: "Loan" },
                        {
                          value: "Exchange Vehicle",
                          label: "Exchange Vehicle",
                        },
                        { value: "Insurance", label: "Insurance" },
                        { value: "Commission", label: "Commission" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">
                    Payment made by
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Payment mode
                  </div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentMode}
                      onChange={setModalPaymentMode}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        {
                          value: "Online Transfer/UPI",
                          label: "Online Transfer/UPI",
                        },
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
                  <div className="text-[11px] text-muted-foreground">
                    Payment amount
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Payment date
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Transaction details
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Bank name
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Remarks
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Receipt mode
                  </div>
                  <div className="border border-border rounded-xl bg-background px-2 py-1.5">
                    <Select
                      value={modalPaymentMode}
                      onChange={setModalPaymentMode}
                      style={{ width: "100%" }}
                      bordered={false}
                      options={[
                        {
                          value: "Online Transfer/UPI",
                          label: "Online Transfer/UPI",
                        },
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
                  <div className="text-[11px] text-muted-foreground">
                    Receipt amount
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Receipt date
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Transaction details
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Bank name
                  </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    Remarks
                  </div>
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
