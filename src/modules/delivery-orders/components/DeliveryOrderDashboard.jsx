// src/modules/delivery-orders/components/DeliveryOrderDashboard.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Select,
  Input,
  Button,
  Space,
  message,
  Tooltip,
  Tag,
  Pagination,
  Empty,
  Modal,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  FileTextOutlined,
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { loansApi } from "../../../api/loans";
import BreakdownSummaryCard from "./shared/BreakdownSummaryCard";
import { useTheme } from "../../../context/ThemeContext";

const { Option } = Select;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹${asInt(n).toLocaleString("en-IN")}`;

const hasValue = (v) => asInt(v) > 0;

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const normalizeLoanId = (value) => safeText(value).trim();

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
    const nextTs =
      new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
    if (nextTs >= prevTs) byLoanId.set(key, row);
  });
  return Array.from(byLoanId.values());
};

const chunkArray = (arr = [], size = 300) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const fetchAllDOs = async () => {
  const pageSize = 1000;
  let skip = 0;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const res = await deliveryOrdersApi.getAll({
      limit: pageSize,
      skip,
      noCount: true,
    });
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

  const chunks = chunkArray(ids, 300);
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

const fetchAllNewCarLoans = async () => {
  const pageSize = 1000;
  let page = 1;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const payload = await loansApi.getAll({
      page,
      limit: pageSize,
      noCount: true,
      filterLoanType: "New Car",
      view: "dashboard",
      sortBy: "leadDate",
      sortDir: "desc",
    });
    const rows = listFromResponse(payload);
    all.push(...rows);
    hasMore = Boolean(payload?.hasMore) && rows.length > 0;
    page += 1;
  }

  return all;
};

const buildLoanFallbackFromDO = (d = {}) => ({
  loanId: normalizeLoanId(d.loanId || d.do_loanId),
  customerName: safeText(d.customerName || d.do_customerName || d.customer_name),
  primaryMobile: safeText(d.primaryMobile || d.do_primaryMobile || d.mobile),
  vehicleMake: safeText(d.vehicleMake || d.make),
  vehicleModel: safeText(d.vehicleModel || d.model),
  vehicleVariant: safeText(d.vehicleVariant || d.variant),
  isFinanced: safeText(d.isFinanced || "No"),
  recordSource: safeText(d.recordSource || d.source || d.sourcing),
  sourceName: safeText(d.sourceName || d.do_sourceName),
  _hasLinkedLoan: false,
});

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return !["n/a", "na", "null", "undefined", "-", "--", "not set"].includes(
    text.toLowerCase(),
  );
};

const firstMeaningful = (...values) => {
  for (const value of values) {
    if (hasMeaningfulValue(value)) return value;
  }
  return "";
};

const getDoNumber = (d = {}) => firstMeaningful(d?.do_refNo, d?.doNumber, d?.do_number);

const getShowroomOnRoad = (d = {}) =>
  asInt(firstMeaningful(d?.do_onRoadVehicleCost, d?.do_onroad_vehicle_cost, d?.do_onRoadCost));

const getShowroomGross = (d = {}) =>
  asInt(firstMeaningful(d?.do_grossDO, d?.do_gross_do));

const getShowroomDiscount = (d = {}) =>
  asInt(firstMeaningful(d?.do_totalDiscount, d?.do_total_discount));

const getShowroomNet = (d = {}) =>
  asInt(firstMeaningful(d?.do_netOnRoadVehicleCost, d?.do_net_onRoadVehicleCost));

const getCustomerOnRoad = (d = {}) =>
  asInt(
    firstMeaningful(
      d?.do_customer_onRoadVehicleCost,
      d?.do_customer_onroad_vehicle_cost,
      d?.do_onRoadVehicleCost,
      d?.do_onroad_vehicle_cost,
    ),
  );

const getCustomerGross = (d = {}) =>
  asInt(
    firstMeaningful(
      d?.do_customer_grossDO,
      d?.do_customer_gross_do,
      d?.do_grossDO,
      d?.do_gross_do,
    ),
  );

const getCustomerDiscount = (d = {}) =>
  asInt(firstMeaningful(d?.do_customer_totalDiscount, d?.do_customer_total_discount));

const getCustomerNet = (d = {}) =>
  asInt(
    firstMeaningful(
      d?.do_customer_netOnRoadVehicleCost,
      d?.do_customer_net_onRoadVehicleCost,
      d?.do_customer_net_onroad_vehicle_cost,
    ),
  );

const normalizeLoanRow = (loan = {}, doDoc = null) => ({
  ...loan,
  loanId: normalizeLoanId(loan?.loanId || loan?.loan_number || loan?._id || doDoc?.loanId || doDoc?.do_loanId),
  customerName: firstMeaningful(
    loan?.customerName,
    loan?.applicant_name,
    loan?.applicantName,
    doDoc?.customerName,
    doDoc?.do_customerName,
    doDoc?.customer_name,
  ),
  primaryMobile: firstMeaningful(
    loan?.primaryMobile,
    loan?.mobile,
    loan?.phone,
    loan?.phoneNumber,
    doDoc?.primaryMobile,
    doDoc?.do_primaryMobile,
    doDoc?.mobile,
  ),
  recordSource: firstMeaningful(
    loan?.recordSource,
    loan?.source,
    loan?.sourcingChannel,
    doDoc?.recordSource,
    doDoc?.do_recordSource,
    doDoc?.source,
  ),
  sourceName: firstMeaningful(
    loan?.sourceName,
    loan?.showroomDealerName,
    loan?.dealerName,
    loan?.showroomName,
    doDoc?.sourceName,
    doDoc?.do_sourceName,
    doDoc?.dealerName,
  ),
  vehicleMake: firstMeaningful(loan?.vehicleMake, loan?.make, doDoc?.do_vehicleMake, doDoc?.vehicleMake, doDoc?.make),
  vehicleModel: firstMeaningful(loan?.vehicleModel, loan?.model, doDoc?.do_vehicleModel, doDoc?.vehicleModel, doDoc?.model),
  vehicleVariant: firstMeaningful(loan?.vehicleVariant, loan?.variant, doDoc?.do_vehicleVariant, doDoc?.vehicleVariant, doDoc?.variant),
  vehicleRegNo: firstMeaningful(
    loan?.vehicleRegNo,
    loan?.registrationNumber,
    loan?.rc_redg_no,
    doDoc?.do_vehicleRegNo,
    doDoc?.do_redgNo,
  ),
  isFinanced: firstMeaningful(loan?.isFinanced, doDoc?.isFinanced, "No"),
});

const StatCard = ({ id, label, value, subtext, icon, onClick }) => {
  const gradients = {
    total: "from-sky-500 to-indigo-600",
    created: "from-emerald-500 to-green-600",
    pending: "from-amber-500 to-orange-600",
    netdo: "from-violet-500 to-fuchsia-600",
  };
  const gradient = gradients[id] || "from-slate-600 to-slate-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${gradient} p-4 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/70">
            {label}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
            {value}
          </p>
          {subtext && <p className="mt-1 text-xs text-white/80">{subtext}</p>}
        </div>
        <div className="mt-1 h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shrink-0">
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </button>
  );
};

const SectionPanel = ({ title, chip, children, tone = "slate", onOpen }) => {
  const tones = {
    slate:
      "border-slate-200/80 bg-slate-50/80 dark:border-[#303030] dark:bg-[#202020]",
    blue:
      "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/20",
    green:
      "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    purple:
      "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/40 dark:bg-violet-950/20",
    amber:
      "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
  };
  const Wrapper = onOpen ? "button" : "div";
  return (
    <Wrapper
      type={onOpen ? "button" : undefined}
      onClick={onOpen || undefined}
      className={`rounded-2xl border p-3 text-left transition ${
        onOpen
          ? "cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          : ""
      } ${tones[tone] || tones.slate}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-600 dark:text-slate-300">
          {title}
        </p>
        <div className="flex items-center gap-1">{chip}</div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </Wrapper>
  );
};

const KeyValue = ({ label, value, strong = false, subtle = false }) => (
  <div className="flex items-start justify-between gap-3 text-[12px]">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span
      className={`text-right ${
        strong
          ? "font-semibold text-slate-900 dark:text-slate-50"
          : subtle
            ? "text-slate-500 dark:text-slate-400"
            : "text-slate-700 dark:text-slate-200"
      }`}
    >
      {value}
    </span>
  </div>
);

const DeliveryOrderDashboard = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loanUniverse, setLoanUniverse] = useState([]);
  const [loadingLoanUniverse, setLoadingLoanUniverse] = useState(false);

  const [statusFilter, setStatusFilter] = useState("All"); // All / Created / NotCreated / MissingLoan
  const [financeFilter, setFinanceFilter] = useState("All"); // All / Financed / Cash
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    type: "showroom",
    loan: null,
    doDoc: null,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const docs = dedupeDOByLoanId(await fetchAllDOs());
      setDeliveryOrders(Array.isArray(docs) ? docs : []);
      const initialRows = docs.map((doc) =>
        normalizeLoanRow(buildLoanFallbackFromDO(doc), doc),
      );
      setRows(initialRows);
      setLoading(false);

      const loanIds = docs
        .map((d) => normalizeLoanId(d?.loanId || d?.do_loanId))
        .filter(Boolean);

      const linkedLoans = await fetchLoansByIds(loanIds);
      const linkedMap = new Map();
      (linkedLoans || []).forEach((loan) => {
        const id = normalizeLoanId(
          loan?.loanId || loan?.loan_number || loan?._id,
        );
        if (!id) return;
        linkedMap.set(id, normalizeLoanRow({ ...loan, loanId: id, _hasLinkedLoan: true }));
      });

      const mergedRows = docs.map((doc) => {
        const id = normalizeLoanId(doc?.loanId || doc?.do_loanId);
        return linkedMap.get(id) || normalizeLoanRow(buildLoanFallbackFromDO(doc), doc);
      });
      setRows(mergedRows);
    } catch (err) {
      console.error("Load DO Dashboard Error:", err);
      setRows([]);
      setDeliveryOrders([]);
      message.error("Failed to load Delivery Orders from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, financeFilter, searchText, pageSize]);

  const ensureLoanUniverse = useCallback(async () => {
    if (loanUniverse.length > 0 || loadingLoanUniverse) return;
    try {
      setLoadingLoanUniverse(true);
      const allNewCars = await fetchAllNewCarLoans();
      const normalized = allNewCars.map((loan) => normalizeLoanRow(loan));
      setLoanUniverse(normalized);
    } catch (error) {
      console.error("Failed to load loan universe for DO Not Created filter", error);
      message.error("Failed to load DO not created cases");
    } finally {
      setLoadingLoanUniverse(false);
    }
  }, [loanUniverse.length, loadingLoanUniverse]);

  useEffect(() => {
    if (statusFilter === "NotCreated") {
      void ensureLoanUniverse();
    }
  }, [statusFilter, ensureLoanUniverse]);

  const doMap = useMemo(() => {
    const map = {};
    (deliveryOrders || []).forEach((d) => {
      const key1 = normalizeLoanId(d?.loanId);
      const key2 = normalizeLoanId(d?.do_loanId);
      if (key1) map[key1] = d;
      if (key2) map[key2] = d;
    });
    return map;
  }, [deliveryOrders]);

  const stats = useMemo(() => {
    const totalEntries = rows.length;
    const created = rows.filter((l) => !!doMap[l.loanId]).length;
    const missingLoan = rows.filter((l) => !l?._hasLinkedLoan).length;
    const allNet = rows
      .map((l) => asInt(doMap[l.loanId]?.do_netDOAmount))
      .filter((n) => n > 0);
    const totalNet =
      allNet.length > 0 ? money(allNet.reduce((a, b) => a + b, 0)) : "₹0";
    const avgNet =
      allNet.length > 0
        ? money(allNet.reduce((a, b) => a + b, 0) / allNet.length)
        : "—";

    return [
      {
        id: "total",
        label: "Total DO Entries",
        value: totalEntries,
        icon: <FileTextOutlined />,
        onClick: () => {
          setStatusFilter("All");
          setFinanceFilter("All");
        },
      },
      {
        id: "created",
        label: "DO Created",
        value: created,
        icon: <CheckCircleOutlined />,
        onClick: () => setStatusFilter("Created"),
      },
      {
        id: "pending",
        label: "Loan Link Missing",
        value: missingLoan,
        icon: <ClockCircleOutlined />,
        onClick: () => setStatusFilter("MissingLoan"),
      },
      {
        id: "netdo",
        label: "Total Net DO",
        value: totalNet,
        subtext: `Avg: ${avgNet}`,
        icon: <AlertOutlined />,
        onClick: () => setStatusFilter("Created"),
      },
    ];
  }, [rows, doMap]);

  const filteredRows = useMemo(() => {
    const doLoanIds = new Set(Object.keys(doMap || {}));
    const notCreatedRows =
      statusFilter === "NotCreated"
        ? loanUniverse
            .filter((loan) => {
              const id = normalizeLoanId(loan?.loanId || loan?.loan_number || loan?._id);
              return !!id && !doLoanIds.has(id);
            })
            .map((loan) => ({ ...normalizeLoanRow(loan), _hasLinkedLoan: true }))
        : [];

    const sourceRows = statusFilter === "NotCreated" ? notCreatedRows : rows;

    return sourceRows.filter((loan) => {
      const d = doMap[loan.loanId];
      if (statusFilter === "Created" && !d) return false;
      if (statusFilter === "MissingLoan" && loan?._hasLinkedLoan) return false;
      if (statusFilter === "NotCreated" && d) return false;

      const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
      if (financeFilter === "Financed" && !financed) return false;
      if (financeFilter === "Cash" && financed) return false;

      if (searchText) {
        const vehicle = `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel,
        )} ${safeText(loan.vehicleVariant)}`.toLowerCase();
        const blob = `${safeText(loan.loanId)} ${safeText(
          loan.customerName,
        )} ${safeText(loan.recordSource)} ${safeText(loan.sourceName)} ${vehicle} ${safeText(
          d?.do_refNo || d?.doNumber,
        )}`.toLowerCase();
        if (!blob.includes(searchText.toLowerCase())) return false;
      }

      return true;
    });
  }, [rows, loanUniverse, doMap, statusFilter, financeFilter, searchText]);

  const totalCount = filteredRows.length;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const openSummaryModal = useCallback((type, loan, doDoc) => {
    setSummaryModal({ open: true, type, loan, doDoc });
  }, []);

  const closeSummaryModal = useCallback(() => {
    setSummaryModal({ open: false, type: "showroom", loan: null, doDoc: null });
  }, []);

  const handleDeleteDO = useCallback(
    async (loanRow) => {
      const id = normalizeLoanId(loanRow?.loanId);
      if (!id) return;
      const ok = window.confirm(`Delete Delivery Order for ${id}?`);
      if (!ok) return;
      try {
        await deliveryOrdersApi.deleteByLoanId(id);
        message.success("Delivery Order deleted");
        await loadData();
      } catch (error) {
        console.error("Delete DO failed", error);
        message.error("Failed to delete Delivery Order");
      }
    },
    [loadData],
  );

  const summaryRows = useMemo(() => {
    const d = summaryModal?.doDoc || {};
    if (!summaryModal?.open) return { title: "", subtitle: "", chip: "", sections: [] };

    const baseAdditions = [
      { label: "Ex-Showroom Price", value: d?.do_exShowroomPrice, intent: "addition" },
      { label: "TCS", value: d?.do_tcs, intent: "addition" },
      { label: "EPC", value: d?.do_epc, intent: "addition" },
      { label: "Insurance Cost", value: d?.do_insuranceCost, intent: "addition" },
      { label: "Road Tax", value: d?.do_roadTax, intent: "addition" },
      { label: "Accessories Amount", value: d?.do_accessoriesAmount, intent: "addition" },
      { label: "Fastag", value: d?.do_fastag, intent: "addition" },
      { label: "Extended Warranty", value: d?.do_extendedWarranty, intent: "addition" },
    ].filter((row) => hasValue(row.value));

    if (summaryModal.type === "showroom") {
      return {
        title: `${safeText(summaryModal?.loan?.vehicleMake)} ${safeText(
          summaryModal?.loan?.vehicleModel,
        )} ${safeText(summaryModal?.loan?.vehicleVariant)}`.trim(),
        subtitle: "Showroom account",
        chip: "Showroom",
        sections: [
          {
            title: "On-road build-up",
            rows: baseAdditions,
          },
          {
            title: "Discounts / deductions",
            rows: [
              { label: "Margin Money Paid", value: d?.do_marginMoneyPaid, intent: "discount" },
              { label: "Dealer Discount", value: d?.do_dealerDiscount, intent: "discount" },
              { label: "Scheme Discount", value: d?.do_schemeDiscount, intent: "discount" },
              { label: "Insurance Cashback", value: d?.do_insuranceCashback, intent: "discount" },
              { label: "Exchange", value: d?.do_exchange, intent: "discount" },
              { label: "Exchange Vehicle Price", value: d?.do_exchangeVehiclePrice, intent: "discount" },
              { label: "Loyalty", value: d?.do_loyalty, intent: "discount" },
              { label: "Corporate", value: d?.do_corporate, intent: "discount" },
            ].filter((row) => hasValue(row.value)),
          },
          {
            title: "Showroom on-road summary",
            rows: [
              { label: "On-Road Cost", value: getShowroomOnRoad(d), intent: "total", strong: true },
              { label: "Gross DO", value: getShowroomGross(d), intent: "total", strong: true },
              { label: "Total Discount", value: getShowroomDiscount(d), intent: "discount", strong: true },
              { label: "Net On-Road", value: getShowroomNet(d), intent: "total", strong: true },
            ],
          },
        ],
      };
    }

    if (summaryModal.type === "customer") {
      return {
        title: `${safeText(summaryModal?.loan?.vehicleMake)} ${safeText(
          summaryModal?.loan?.vehicleModel,
        )} ${safeText(summaryModal?.loan?.vehicleVariant)}`.trim(),
        subtitle: "Customer account",
        chip: "Customer",
        sections: [
          {
            title: "On-road build-up",
            rows: baseAdditions,
          },
          {
            title: "Discounts / deductions",
            rows: [
              { label: "Margin Money Paid", value: d?.do_marginMoneyPaid, intent: "discount" },
              { label: "Dealer Discount", value: d?.do_customer_dealerDiscount, intent: "discount" },
              { label: "Scheme Discount", value: d?.do_customer_schemeDiscount, intent: "discount" },
              { label: "Insurance Cashback", value: d?.do_customer_insuranceCashback, intent: "discount" },
              { label: "Exchange", value: d?.do_customer_exchange, intent: "discount" },
              { label: "Vehicle Value", value: d?.do_customer_vehicleValue, intent: "discount" },
              { label: "Loyalty", value: d?.do_customer_loyalty, intent: "discount" },
              { label: "Corporate", value: d?.do_customer_corporate, intent: "discount" },
            ].filter((row) => hasValue(row.value)),
          },
          {
            title: "Customer on-road summary",
            rows: [
              { label: "On-Road Cost", value: getCustomerOnRoad(d), intent: "total", strong: true },
              { label: "Gross DO", value: getCustomerGross(d), intent: "total", strong: true },
              { label: "Total Discount", value: getCustomerDiscount(d), intent: "discount", strong: true },
              { label: "Net On-Road", value: getCustomerNet(d), intent: "total", strong: true },
            ],
          },
        ],
      };
    }

    return {
      title: safeText(getDoNumber(d)) || "Delivery Order",
      subtitle: "DO summary",
      chip: safeText(d?.do_accountType || "Showroom"),
      sections: [
        {
          title: "DO header",
          rows: [
            { label: "DO Number", value: safeText(getDoNumber(d)) || "—", raw: true },
            { label: "DO Date", value: d?.do_date ? dayjs(d.do_date).format("DD/MM/YYYY") : "—", raw: true },
            { label: "Booking Date", value: d?.do_bookingDate ? dayjs(d.do_bookingDate).format("DD/MM/YYYY") : "—", raw: true },
            { label: "Account Type", value: safeText(d?.do_accountType || "Showroom"), raw: true },
          ],
        },
        {
          title: "Finance & registration",
          rows: [
            { label: "Processing Fees", value: d?.do_processingFees, intent: "warning" },
            { label: "Loan Amount", value: d?.do_loanAmount, intent: "addition" },
            { label: "Net DO Amount", value: d?.do_netDOAmount, intent: "total", strong: true },
            { label: "Updated", value: d?.updatedAt ? dayjs(d.updatedAt).format("DD MMM YYYY, HH:mm") : "—", raw: true },
          ],
        },
      ],
    };
  }, [summaryModal]);

  return (
    <div className="px-4 md:px-6 py-6 bg-slate-50 dark:bg-[#171717] min-h-screen">
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#262626] text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-2">
              <CarOutlined style={{ fontSize: 11 }} />
              Delivery Orders
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
              Delivery Orders Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loan, vehicle, showroom account, customer account and DO summary in one board view.
            </p>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              size="large"
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/delivery-orders/new")}
              size="large"
            >
              New DO
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={() => navigate("/loans")}
              size="large"
            >
              Go to Loans
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <StatCard key={stat.id} {...stat} />
          ))}
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-300 focus-within:bg-white">
                <SearchOutlined className="text-slate-400" />
                <Input
                  bordered={false}
                  placeholder="Search Loan ID, DO Ref, customer, source or vehicle..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  className="bg-transparent"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All DO Status</Option>
              <Option value="Created">DO Created</Option>
              <Option value="NotCreated">DO Not Created</Option>
              <Option value="MissingLoan">Loan Link Missing</Option>
            </Select>

            <Select
              value={financeFilter}
              onChange={setFinanceFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Types</Option>
              <Option value="Financed">Financed</Option>
              <Option value="Cash">Cash</Option>
            </Select>
          </div>

          {(statusFilter !== "All" || financeFilter !== "All" || searchText) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#262626]">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setFinanceFilter("All");
                  setSearchText("");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
          {statusFilter === "NotCreated" && (
            <div className="mt-2 text-xs text-slate-500">
              {loadingLoanUniverse
                ? "Loading DO-not-created cases..."
                : `Showing ${filteredRows.length} loans without DO`}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {pagedRows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10">
            <Empty
              description={
                loading || (statusFilter === "NotCreated" && loadingLoanUniverse)
                  ? "Loading DO entries..."
                  : "No delivery orders found"
              }
            />
          </div>
        )}

        {pagedRows.map((loan) => {
          const d = doMap[loan.loanId];
          const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
          const loanType = financed ? "Financed" : "Cash";
          const vehicleText = `${safeText(loan.vehicleMake)} ${safeText(
            loan.vehicleModel,
          )} ${safeText(loan.vehicleVariant)}`.trim();
          const doDate = dayjs(d?.do_date || d?.doDate);
          const doDateLabel = doDate.isValid() ? doDate.format("DD/MM/YYYY") : "—";
          const accountType = d ? safeText(d?.do_accountType || "Showroom") || "Showroom" : "";
          const showroomName = firstMeaningful(
            loan?.showroomDealerName,
            loan?.delivery_dealerName,
            loan?.dealerName,
            loan?.showroomName,
            d?.do_dealerName,
            d?.dealerName,
            d?.showroomDealerName,
            d?.showroomName,
          );

          return (
            <div
              key={loan.loanId}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-[#2a2a2a] dark:bg-[#1b1b1b]"
            >
              <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-2">
                <Tag color={d ? "success" : "default"}>{d ? "DO Created" : "Not Created"}</Tag>
                <Tag color={financed ? "blue" : "green"}>{loanType}</Tag>
                {d && accountType ? <Tag color="purple">{accountType} Account</Tag> : null}
                {getDoNumber(d) ? <Tag>{safeText(getDoNumber(d))}</Tag> : null}
                {!loan?._hasLinkedLoan && <Tag color="warning">Loan Link Missing</Tag>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 px-4 pb-4">
                <SectionPanel title="Loan Details" tone="slate">
                  <KeyValue label="Customer" value={safeText(loan.customerName) || "—"} strong />
                  <KeyValue label="Mobile" value={safeText(loan.primaryMobile) || "—"} />
                  <KeyValue label="Loan ID" value={safeText(loan.loanId) || "—"} />
                  <KeyValue label="Type" value={loanType} />
                  <KeyValue label="Source" value={safeText(loan.recordSource) || "Direct"} />
                  <KeyValue label="Name" value={safeText(loan.sourceName) || "—"} />
                </SectionPanel>

                <SectionPanel title="Vehicle Details" tone="blue">
                  <KeyValue label="Vehicle" value={vehicleText || "—"} strong />
                  <KeyValue label="Showroom" value={safeText(showroomName) || "—"} />
                  <KeyValue label="Reg No" value={safeText(loan?.vehicleRegNo || d?.do_vehicleRegNo) || "—"} />
                  <KeyValue label="Color" value={safeText(d?.do_vehicleColor || d?.vehicleColor) || "—"} />
                </SectionPanel>

                <SectionPanel
                  title="Showroom Account"
                  tone="green"
                  onOpen={d ? () => openSummaryModal("showroom", loan, d) : null}
                >
                  <KeyValue label="On-Road Cost" value={hasValue(getShowroomOnRoad(d)) ? money(getShowroomOnRoad(d)) : "—"} strong />
                  <KeyValue label="Gross DO" value={hasValue(getShowroomGross(d)) ? money(getShowroomGross(d)) : "—"} />
                  <KeyValue label="Total Discount" value={hasValue(getShowroomDiscount(d)) ? money(getShowroomDiscount(d)) : "—"} />
                  <KeyValue label="Net On-Road" value={hasValue(getShowroomNet(d)) ? money(getShowroomNet(d)) : "—"} />
                </SectionPanel>

                <SectionPanel
                  title="Customer Account"
                  tone="purple"
                  onOpen={d ? () => openSummaryModal("customer", loan, d) : null}
                  chip={d?.do_showCustomerVehicleSection ? <Tag color="purple">Enabled</Tag> : null}
                >
                  <KeyValue label="On-Road Cost" value={hasValue(getCustomerOnRoad(d)) ? money(getCustomerOnRoad(d)) : "—"} strong />
                  <KeyValue label="Gross DO" value={hasValue(getCustomerGross(d)) ? money(getCustomerGross(d)) : "—"} />
                  <KeyValue label="Total Discount" value={hasValue(getCustomerDiscount(d)) ? money(getCustomerDiscount(d)) : "—"} />
                  <KeyValue label="Net On-Road" value={hasValue(getCustomerNet(d)) ? money(getCustomerNet(d)) : "—"} />
                </SectionPanel>

                <SectionPanel
                  title="DO Details"
                  tone="amber"
                  onOpen={d ? () => openSummaryModal("do", loan, d) : null}
                >
                  <KeyValue
                    label="DO Ref"
                    value={safeText(getDoNumber(d)) || "—"}
                    strong
                  />
                  <KeyValue label="DO Date" value={doDateLabel} />
                  <KeyValue label="Account Type" value={accountType || "—"} />
                  <KeyValue
                    label="Net DO Amount"
                    value={hasValue(d?.do_netDOAmount) ? money(d?.do_netDOAmount) : "—"}
                    strong
                  />
                  <KeyValue label="Updated" value={d?.updatedAt ? dayjs(d.updatedAt).format("DD MMM, HH:mm") : "—"} subtle />
                </SectionPanel>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3 dark:border-[#2a2a2a] dark:bg-[#202020]">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {safeText(loan.customerName) || "Customer"} · {safeText(loan.loanId) || "Loan"}
                </div>
                <Space>
                  <Tooltip title="Open loan file">
                    <Button
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/loans/edit/${loan.loanId}`)}
                    >
                      Open Loan
                    </Button>
                  </Tooltip>

                  {!d ? (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                    >
                      Create DO
                    </Button>
                  ) : (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                      >
                        Edit DO
                      </Button>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/delivery-orders/${loan.loanId}?view=1`)}
                      >
                        View DO
                      </Button>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteDO(loan)}
                      >
                        Delete DO
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </div>
          );
        })}
      </div>

      {totalCount > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 flex justify-end dark:border-[#2a2a2a] dark:bg-[#1b1b1b]">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalCount}
            showSizeChanger
            pageSizeOptions={["10", "15", "25", "50"]}
            showTotal={(total) => `Total ${total} DO entries`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              if (nextSize !== pageSize) setPageSize(nextSize);
            }}
          />
        </div>
      )}

      <Modal
        open={summaryModal.open}
        onCancel={closeSummaryModal}
        footer={null}
        width={700}
        title={null}
      >
        <BreakdownSummaryCard
          isDarkMode={isDarkMode}
          eyebrow={
            summaryModal.type === "showroom"
              ? "Showroom on-road breakdown"
              : summaryModal.type === "customer"
                ? "Customer on-road breakdown"
                : "Net DO breakdown"
          }
          title={summaryRows.title || "Summary"}
          subtitle={summaryRows.subtitle}
          chipLabel={summaryRows.chip || "Summary"}
          chipTone={
            summaryModal.type === "showroom"
              ? "blue"
              : summaryModal.type === "customer"
                ? "purple"
                : "amber"
          }
          sections={summaryRows.sections}
          compact
        />
      </Modal>

    </div>
  );
};

export default DeliveryOrderDashboard;
