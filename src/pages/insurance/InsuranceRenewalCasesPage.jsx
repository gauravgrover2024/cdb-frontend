import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DatePicker,
  Input,
  Modal,
  Popover,
  Popconfirm,
  Tooltip,
  message,
} from "antd";
import InsuranceAntdProvider from "../../components/insurance/InsuranceAntdProvider";
import "../../components/insurance/insurance-forms.css";
import "./insurance-dashboard.css";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  Activity,
  CarFront,
  CheckCircle,
  Clock3,
  DollarSign,
  Eye,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Trash2,
  X,
  XCircle,
  Phone,
} from "lucide-react";
import {
  buildInsurancePaymentTimeline,
  cycleAdjustedDaysUntilExpiry,
  getCycleAdjustedExpiryDate,
  getEffectiveOdTenureYears,
  getPolicyPulseExpiryDate,
  getPolicyPulseMeta,
  parsePolicyIncludedAddons,
  premiumNum,
  resolveActivePolicySnapshot,
  resolveInsuranceReference,
  shouldShowInsuranceChannelBadge,
  getPolicyOriginType,
  getInsuranceDisplayCaseId,
} from "../../utils/insurancePolicyDisplay";
import { insuranceApi } from "../../api/insurance";
import { useAuth } from "../../context/AuthContext";
import InsurancePreview from "../../components/insurance/InsurancePreview";
import PremiumBreakupCard from "../../components/insurance/PremiumBreakupCard";

const LEAD_STATUS_OPTIONS = [
  "New",
  "Quotes Shared",
  "Payment Pending",
  "Closed",
];
const RENEWAL_STATUS_ACTION_GROUPS = [
  {
    id: "actions",
    label: "Actions",
    actions: [
      {
        key: "ALREADY_RENEWED",
        label: "Already Renewed",
        desc: "Move to renewed tab",
        tone: "renewed",
        icon: CheckCircle,
      },
      {
        key: "CAR_SOLD",
        label: "Car Sold",
        desc: "Close policy",
        tone: "sold",
        icon: CarFront,
      },
      {
        key: "CAR_EXPIRED",
        label: "Car Expired",
        desc: "Close policy",
        tone: "expired",
        icon: XCircle,
      },
      {
        key: "POLICY_FROM_ELSEWHERE",
        label: "Policy from Elsewhere",
        desc: "Move to external",
        tone: "view",
        icon: Shield,
      },
      {
        key: "RENEW_NEXT_YEAR",
        label: "Renew Next Year",
        desc: "Schedule reminder",
        tone: "renew",
        icon: Clock3,
      },
    ],
  },
];

const renewalLeadStatusTone = (status) => {
  const s = String(status || "").trim();
  if (s === "Closed") return { bg: "#fff1f2", color: "#be123c", ring: "#fecdd3" };
  if (s === "Payment Pending") {
    return { bg: "#fffbeb", color: "#b45309", ring: "#fde68a" };
  }
  if (s === "Quotes Shared") {
    return { bg: "#eff6ff", color: "#1d4ed8", ring: "#bfdbfe" };
  }
  if (s === "Follow Up") {
    return { bg: "#f5f3ff", color: "#6d28d9", ring: "#ddd6fe" };
  }
  return { bg: "#ecfdf5", color: "#047857", ring: "#a7f3d0" };
};

const RenewalStatusActionPanel = ({ row, draft, onAction, onClose }) => {
  const status =
    draft?.renewalLeadStatus ?? row?.renewalLeadStatus ?? "New";
  const tone = renewalLeadStatusTone(status);
  
  const snap = row?.customerSnapshot || {};
  const buyerType = String(
    row?.buyerType || snap.buyerType || "Individual",
  )
    .trim()
    .toLowerCase();
  const isCompany = buyerType === "company";
  const companyName = isCompany
    ? (row?.companyName || snap.companyName || "")
    : "";
  const contactPerson = isCompany
    ? (row?.contactPersonName || snap.contactPersonName || "")
    : "";
  const customerName =
    resolveInsuranceCustomerDisplay({
      customerName: row?.customerName || snap.customerName || "",
      companyName,
      contactPersonName: contactPerson,
      sourceName: row?.sourceName,
      dealerChannelName: row?.dealerChannelName,
    }) ||
    row?.customerName ||
    snap.customerName ||
    "—";
  const sourceIdentity = String(
    row?.sourceName ||
    row?.dealerChannelName ||
    row?.referenceName ||
    "",
  )
    .trim()
    .toLowerCase();
  const customerIdentity = String(customerName || "")
    .trim()
    .toLowerCase();
  const customerLooksLikeSource =
    Boolean(sourceIdentity) && sourceIdentity === customerIdentity;
  const customerLooksLikeChannelAlias =
    /(broker|broking|dealer|agency|channel|dsa|pos|crm)/i.test(
      String(customerName || ""),
    );
  const displayName =
    buyerType === "company"
      ? companyName || contactPerson || customerName || "—"
      : customerLooksLikeSource || customerLooksLikeChannelAlias
        ? contactPerson || customerName || companyName || "—"
        : customerName || contactPerson || companyName || "—";

  const customer = displayName;
  const reg = row?.registrationNumber || "—";
  const activePolicy = resolveActivePolicySnapshot(row);
  const cycleAdjustedExpiry = getCycleAdjustedExpiryDate(
    getPolicyPulseExpiryDate(row),
    dayjs(),
    {
      odTenureYears: getEffectiveOdTenureYears(row),
      policyStartDate:
        row?.newPolicyStartDate || row?.previousPolicyStartDate || "",
    },
  );
  const expiryLabel = cycleAdjustedExpiry
    ? cycleAdjustedExpiry.format("DD MMM YYYY")
    : activePolicy.expiryLabel || "—";

  return (
    <div className="renewal-status-panel">
      <div className="renewal-status-panel__head">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Update status
          </p>
          <p className="mt-0.5 truncate text-[15px] font-bold text-slate-900">
            {getInsuranceDisplayCaseId(row) || "Case"}
          </p>
          <p className="truncate text-[12px] text-slate-500">{customer}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="renewal-status-panel__close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="renewal-status-panel__meta">
        <span
          className="renewal-status-panel__badge"
          style={{
            background: tone.bg,
            color: tone.color,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
        >
          {status}
        </span>
        <span className="renewal-status-panel__meta-item">{reg}</span>
        <span className="renewal-status-panel__meta-item">Exp {expiryLabel}</span>
      </div>

      <div className="renewal-status-panel__body">
        {RENEWAL_STATUS_ACTION_GROUPS.map((group) => (
          <section key={group.id} className="renewal-status-panel__section">
            <p className="renewal-status-panel__section-label">{group.label}</p>
            <div className="renewal-status-panel__actions">
              {group.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    className={`renewal-status-action chip-${action.tone}`}
                    onClick={() => onAction(action.key)}
                  >
                    <span className={`renewal-status-action__icon tone-${action.tone}`}>
                      <Icon size={15} strokeWidth={2.25} />
                    </span>
                    <span className="renewal-status-action__text">
                      <span className="renewal-status-action__label">
                        {action.label}
                      </span>
                      {action.desc ? (
                        <span className="renewal-status-action__desc">
                          {action.desc}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const getCaseId = (row) => row?._id || row?.id || row?.caseId || "";

const formatInr = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });

// On the renewal list, the latest issued/expiring policy is the "previous"
// policy relative to the policy the agent is about to create.
const resolvePreviousPolicySnapshot = (record = {}) =>
  resolveActivePolicySnapshot(record);

const resolvePreviousPolicyAddons = (record = {}, snapshot) =>
  parsePolicyIncludedAddons(record, snapshot).filter((item) =>
    hasDisplayValue(item?.name),
  );

const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "n/a";
};

const parseInsuranceDate = (value) => {
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

const resolveInsuranceCustomerDisplay = ({
  customerName = "",
  companyName = "",
  contactPersonName = "",
  sourceName = "",
  dealerChannelName = "",
} = {}) => {
  const name = String(customerName || "").trim();
  const company = String(companyName || "").trim();
  const contact = String(contactPersonName || "").trim();
  const channel = String(sourceName || dealerChannelName || "").trim();

  if (!name) return contact || company || "";

  const parenMatch = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!parenMatch) return name;

  const [, baseName, parenLabel] = parenMatch;
  const baseNorm = baseName.trim().toLowerCase();
  const parenNorm = parenLabel.trim().toLowerCase();
  const contactNorm = contact.toLowerCase();
  const companyNorm = company.toLowerCase();
  const channelNorm = channel.toLowerCase();

  if (contact && contactNorm === baseNorm) {
    if (!company || companyNorm !== parenNorm) return contact;
    if (channel && channelNorm !== parenNorm) return contact;
    return contact;
  }

  if (company && companyNorm !== parenNorm) return baseName.trim();
  if (channel && channelNorm !== parenNorm) return baseName.trim();

  return name;
};

const getVehicleDisplayYear = (record = {}) => {
  const regDate =
    record.dateOfReg ||
    record.registrationDate ||
    record.regDate ||
    record.rc_redg_date ||
    record.vehicleRegistrationDate ||
    "";
  const parsed = parseInsuranceDate(regDate);
  if (parsed) return parsed.format("YYYY");
  return (
    record.mfgYear ||
    record.manufactureYear ||
    record.manufacturingYear ||
    record.vehicleYear ||
    record.registrationYear ||
    ""
  );
};

// Every filter and stat-card count below reads the exact value the card
// renders, so a filter can never disagree with what is on screen.

// Card shows the completed renewal's policy once renewed, else the case itself.
const getDisplayedPolicy = (row = {}) =>
  row?.renewedComplete && row?.renewedPolicy ? row.renewedPolicy : row;

const getRenewalOutcome = (row = {}) =>
  String(row?.renewalOutcome || "NONE").trim().toUpperCase();

const isRenewedRow = (row = {}) =>
  Boolean(row?.renewedComplete) || getRenewalOutcome(row) === "ALREADY_RENEWED";

// Mirrors the backend's renewal / renewed / external tab split.
const getRenewalView = (row = {}) => {
  if (isRenewedRow(row)) return "renewed";
  const outcome = getRenewalOutcome(row);
  if (outcome === "POLICY_FROM_ELSEWHERE") return "external";
  if (["CAR_SOLD", "CAR_EXPIRED", "RENEW_NEXT_YEAR"].includes(outcome)) {
    return "other";
  }
  return "renewal";
};

const getRenewalLeadStatus = (row = {}) => {
  const raw = String(row?.renewalLeadStatus || "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
  return (
    LEAD_STATUS_OPTIONS.find(
      (item) => item.replace(/\s+/g, "").toLowerCase() === raw,
    ) || "New"
  );
};

const getRenewalDaysLeft = (row = {}) =>
  cycleAdjustedDaysUntilExpiry(getDisplayedPolicy(row));

// Same label as the Workflow badge on the card.
const getRenewalPolicyStatus = (row = {}) =>
  getPolicyPulseMeta(getRenewalDaysLeft(row), isRenewedRow(row)).label;

// Same amount as the "Total Premium" on the card.
const getRenewalPremium = (row = {}) => premiumNum(getDisplayedPolicy(row));

// Same value as the New Car / Used Car badge on the card.
const getRenewalVehicleType = (row = {}) =>
  String(row?.vehicleType || "Used Car").trim();

const getRenewalSource = (row = {}) => {
  const raw = String(row?.source || row?.sourceOrigin || "").trim();
  if (/^direct$/i.test(raw)) return "Direct";
  if (/^indirect$/i.test(raw)) return "Indirect";
  return raw || (row?.sourceName ? "Indirect" : "Direct");
};

const matchesExpiryWindow = (days, windowKey) => {
  if (windowKey === "all") return true;
  if (days === null || !Number.isFinite(Number(days))) return false;
  if (windowKey === "expired") return days < 0;
  if (windowKey === "gt60d") return days > 60;
  const limit = Number.parseInt(windowKey, 10);
  return Number.isFinite(limit) && days >= 0 && days <= limit;
};

const matchesTier = (premium, tier) => {
  if (tier === "all") return true;
  if (tier === "high-value") return premium > 50000;
  if (tier === "premium") return premium >= 20000 && premium <= 50000;
  if (tier === "basic") return premium > 0 && premium < 20000;
  return true;
};

const POLICY_STATUS_OPTIONS = [
  "Active",
  "Expiring Soon",
  "Expired",
  "Already Renewed",
  "Pending",
];

const InsuranceRenewalCasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  const [windowFilter, setWindowFilter] = useState("all");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTab, setViewTab] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedStatCard, setSelectedStatCard] = useState("all");
  const [rowDrafts, setRowDrafts] = useState({});
  const [statusActionRow, setStatusActionRow] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [previewStageKey, setPreviewStageKey] = useState("previous");
  const [policyModal, setPolicyModal] = useState({ open: false, row: null });
  const [showAllPolicyAddons, setShowAllPolicyAddons] = useState(false);
  const [renewReminderModal, setRenewReminderModal] = useState({
    open: false,
    row: null,
    date: null,
  });
  const popupContainer = (node) => node?.parentElement || document.body;
  const onWindowChange = (value) => setWindowFilter(String(value || "all"));
  const onPolicyStatusChange = (value) => setPolicyStatusFilter(String(value || "all"));
  const onTierChange = (value) => setTierFilter(String(value || "all"));
  const onLeadStatusChange = (value) => setStatusFilter(String(value || "all"));

  const handleStatCardClick = (cardKey) => {
    if (
      cardKey === "all" ||
      cardKey === "renewal" ||
      cardKey === "renewed" ||
      cardKey === "external"
    ) {
      setViewTab(cardKey);
      setSelectedStatCard("all");
      return;
    }
    setViewTab("all");
    setSelectedStatCard((prev) => (prev === cardKey ? "all" : cardKey));
  };

  const isCardActive = (key) => {
    if (key === "all") return viewTab === "all" && selectedStatCard === "all";
    if (key === "renewal") return viewTab === "renewal" && selectedStatCard === "all";
    if (key === "renewed") return viewTab === "renewed" && selectedStatCard === "all";
    if (key === "external") return viewTab === "external" && selectedStatCard === "all";
    return selectedStatCard === key;
  };

  // Anything that narrows the list — search is server-side, the rest filter
  // client-side; all of them should flip the empty state to "no matches".
  const hasActiveRenewalFilters =
    Boolean(search.trim()) ||
    windowFilter !== "all" ||
    policyStatusFilter !== "all" ||
    tierFilter !== "all" ||
    statusFilter !== "all" ||
    vehicleTypeFilter !== "all" ||
    sourceFilter !== "all" ||
    selectedStatCard !== "all" ||
    viewTab !== "all";

  // Dropdown filters only — stat cards count on top of this set.
  const dropdownFilteredCases = useMemo(
    () =>
      cases.filter(
        (row) =>
          matchesExpiryWindow(getRenewalDaysLeft(row), windowFilter) &&
          (policyStatusFilter === "all" ||
            getRenewalPolicyStatus(row) === policyStatusFilter) &&
          (statusFilter === "all" ||
            getRenewalLeadStatus(row) === statusFilter) &&
          matchesTier(getRenewalPremium(row), tierFilter) &&
          (vehicleTypeFilter === "all" ||
            getRenewalVehicleType(row).toLowerCase() ===
              vehicleTypeFilter.toLowerCase()) &&
          (sourceFilter === "all" ||
            getRenewalSource(row).toLowerCase() === sourceFilter.toLowerCase()),
      ),
    [
      cases,
      windowFilter,
      policyStatusFilter,
      statusFilter,
      tierFilter,
      vehicleTypeFilter,
      sourceFilter,
    ],
  );

  const statCardMatchers = {
    all: () => true,
    renewal: (row) => getRenewalView(row) === "renewal",
    renewed: (row) => getRenewalView(row) === "renewed",
    external: (row) => getRenewalView(row) === "external",
    active: (row) => getRenewalLeadStatus(row) !== "Closed",
    policiesPending: (row) =>
      !String(getDisplayedPolicy(row)?.newPolicyNumber || "").trim(),
    paymentPending: (row) => getRenewalLeadStatus(row) === "Payment Pending",
    highValue: (row) => getRenewalPremium(row) > 50000,
  };

  const statCounts = Object.fromEntries(
    Object.entries(statCardMatchers).map(([key, matcher]) => [
      key,
      dropdownFilteredCases.filter(matcher).length,
    ]),
  );

  const statCards = [
    {
      key: "all",
      label: "All Cases",
      count: statCounts.all,
      icon: LayoutGrid,
      color: "text-slate-600",
      bg: "bg-slate-100",
      borderColor: "border-slate-200",
      activeBg: "bg-slate-700 text-white border-slate-700 shadow-[0_4px_12px_rgba(51,65,85,0.25)]",
      inactiveBg: "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100/50",
      labelActive: "text-slate-200",
      labelInactive: "text-slate-600/80",
    },
    {
      key: "renewal",
      label: "Pending Renewals",
      count: statCounts.renewal,
      icon: Clock3,
      color: "text-rose-600",
      bg: "bg-rose-50",
      borderColor: "border-rose-100",
      activeBg: "bg-rose-600 text-white border-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.25)]",
      inactiveBg: "bg-rose-50 border-rose-100 text-rose-900 hover:bg-rose-100/50",
      labelActive: "text-rose-200",
      labelInactive: "text-rose-600/80",
    },
    {
      key: "renewed",
      label: "Renewed",
      count: statCounts.renewed,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      borderColor: "border-emerald-100",
      activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-[0_4px_12px_rgba(5,150,105,0.25)]",
      inactiveBg: "bg-emerald-50 border-emerald-100 text-emerald-900 hover:bg-emerald-100/50",
      labelActive: "text-emerald-200",
      labelInactive: "text-emerald-600/80",
    },
    {
      key: "external",
      label: "External",
      count: statCounts.external,
      icon: Share2,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      borderColor: "border-indigo-100",
      activeBg: "bg-indigo-600 text-white border-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.25)]",
      inactiveBg: "bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/50",
      labelActive: "text-indigo-200",
      labelInactive: "text-indigo-600/80",
    },
    {
      key: "active",
      label: "Active Cases",
      count: statCounts.active,
      icon: Shield,
      color: "text-blue-600",
      bg: "bg-blue-50",
      borderColor: "border-blue-100",
      activeBg: "bg-blue-600 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.25)]",
      inactiveBg: "bg-blue-50 border-blue-100 text-blue-900 hover:bg-blue-100/50",
      labelActive: "text-blue-200",
      labelInactive: "text-blue-600/80",
    },
    {
      key: "policiesPending",
      label: "Policies Pending",
      count: statCounts.policiesPending,
      icon: ListChecks,
      color: "text-purple-600",
      bg: "bg-purple-50",
      borderColor: "border-purple-100",
      activeBg: "bg-purple-600 text-white border-purple-600 shadow-[0_4px_12px_rgba(124,58,237,0.25)]",
      inactiveBg: "bg-purple-50 border-purple-100 text-purple-900 hover:bg-purple-100/50",
      labelActive: "text-purple-200",
      labelInactive: "text-purple-600/80",
    },
    {
      key: "paymentPending",
      label: "Payment Pending",
      count: statCounts.paymentPending,
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
      borderColor: "border-amber-100",
      activeBg: "bg-amber-600 text-white border-amber-600 shadow-[0_4px_12px_rgba(217,119,6,0.25)]",
      inactiveBg: "bg-amber-50 border-amber-100 text-amber-900 hover:bg-amber-100/50",
      labelActive: "text-amber-200",
      labelInactive: "text-amber-600/80",
    },
    {
      key: "highValue",
      label: "High Value (>50K)",
      count: statCounts.highValue,
      icon: Activity,
      color: "text-teal-600",
      bg: "bg-teal-50",
      borderColor: "border-teal-100",
      activeBg: "bg-teal-600 text-white border-teal-600 shadow-[0_4px_12px_rgba(13,148,136,0.25)]",
      inactiveBg: "bg-teal-50 border-teal-100 text-teal-900 hover:bg-teal-100/50",
      labelActive: "text-teal-200",
      labelInactive: "text-teal-600/80",
    },
  ];

  const loadRequestRef = React.useRef(0);
  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    try {
      // Fetch every renewal case once; tabs, dropdowns and stat-card counts
      // are all derived client-side from these rows so they always agree.
      const casesRes = await insuranceApi.getRenewalCases({
        view: "all",
        search: debouncedSearch || undefined,
      });
      const rows = Array.isArray(casesRes?.data)
        ? casesRes.data
        : Array.isArray(casesRes?.items)
          ? casesRes.items
          : [];
      // A slower response for an older filter set must not overwrite a newer one.
      if (requestId !== loadRequestRef.current) return;
      setCases(rows);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      message.error(err?.message || "Failed to load renewal cases");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filteredCases = useMemo(() => {
    const activeCardKey = selectedStatCard !== "all" ? selectedStatCard : viewTab;
    const matcher = statCardMatchers[activeCardKey] || statCardMatchers.all;
    const rows = dropdownFilteredCases.filter(matcher);

    return rows.sort((a, b) => {
      const aFollow = parseDate(a?.renewalFollowUpDate);
      const bFollow = parseDate(b?.renewalFollowUpDate);
      if (aFollow && bFollow) return aFollow.valueOf() - bFollow.valueOf();
      if (aFollow && !bFollow) return -1;
      if (!aFollow && bFollow) return 1;

      const aDays = getRenewalDaysLeft(a);
      const bDays = getRenewalDaysLeft(b);
      const aNum = Number.isFinite(aDays) ? aDays : Number.POSITIVE_INFINITY;
      const bNum = Number.isFinite(bDays) ? bDays : Number.POSITIVE_INFINITY;
      if (aNum !== bNum) return aNum - bNum;
      const aDate = parseDate(getPolicyPulseExpiryDate(getDisplayedPolicy(a)));
      const bDate = parseDate(getPolicyPulseExpiryDate(getDisplayedPolicy(b)));
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.valueOf() - bDate.valueOf();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownFilteredCases, selectedStatCard, viewTab]);

  const saveRowUpdate = async (row) => {
    const id = getCaseId(row);
    if (!id) return;
    const draft = rowDrafts[id] || {};
    const patch = {
      renewalLeadStatus:
        draft.renewalLeadStatus ?? row.renewalLeadStatus ?? "New",
      renewalFollowUpDate:
        draft.renewalFollowUpDate ?? row.renewalFollowUpDate ?? "",
      renewalComment: draft.renewalComment ?? row.renewalComment ?? "",
      updatedBy: user?.name || "User",
    };
    if (patch.renewalLeadStatus === "Closed") {
      patch.renewalClosedReason =
        draft.renewalClosedReason || row.renewalClosedReason || "";
      if (!patch.renewalClosedReason) {
        message.error("Closed reason is required before saving.");
        return;
      }
    }
    try {
      await insuranceApi.updateRenewalLead(id, patch);
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      message.success("Lead updated");
      await load();
    } catch (err) {
      message.error(err?.message || "Failed to update lead");
    }
  };

  const applyOutcomeAction = async (row, action, extraPayload = {}) => {
    const id = getCaseId(row);
    if (!id) return;
    try {
      await insuranceApi.updateRenewalLead(id, {
        action,
        updatedBy: user?.name || "User",
        ...extraPayload,
      });
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      message.success("Action applied");
      await load();
      if (action === "ALREADY_RENEWED") setViewTab("renewed");
      if (action === "POLICY_FROM_ELSEWHERE") setViewTab("external");
    } catch (err) {
      message.error(err?.message || "Failed to apply action");
    }
  };

  const runStatusAction = async (row, actionKey) => {
    const id = getCaseId(row);
    if (!id) return;
    if (actionKey === "SAVE") {
      await saveRowUpdate(row);
      return;
    }
    if (actionKey === "SHARE_QUOTES") {
      try {
        await insuranceApi.updateRenewalLead(id, {
          renewalLeadStatus: "Quotes Shared",
          action: "SHARE_QUOTES",
          updatedBy: user?.name || "User",
        });
        navigate(`/insurance/edit/${id}?section=quotes&share=1`);
      } catch (err) {
        message.error(err?.message || "Failed to update lead");
      }
      return;
    }
    if (actionKey === "VIEW_QUOTES") {
      navigate(`/insurance/edit/${id}?section=quotes`);
      return;
    }
    if (actionKey === "MARK_PAYMENT_PENDING") {
      try {
        await insuranceApi.updateRenewalLead(id, {
          renewalLeadStatus: "Payment Pending",
          action: "MARK_PAYMENT_PENDING",
          updatedBy: user?.name || "User",
        });
        setRowDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        message.success("Lead marked as Payment Pending");
        await load();
      } catch (err) {
        message.error(err?.message || "Failed to update lead");
      }
      return;
    }
    if (actionKey === "RENEW") {
      navigate(`/insurance/new?renewFrom=${id}`);
      return;
    }
    if (actionKey === "CLOSE_LEAD") {
      setRowDrafts((prev) => ({
        ...prev,
        [id]: { ...prev[id], renewalLeadStatus: "Closed" },
      }));
      message.info("Lead set to Closed. Select reason and click Save.");
      return;
    }
    if (actionKey === "ALREADY_RENEWED") {
      await applyOutcomeAction(row, "ALREADY_RENEWED");
      return;
    }
    if (actionKey === "CAR_SOLD") {
      await applyOutcomeAction(row, "CAR_SOLD");
      return;
    }
    if (actionKey === "CAR_EXPIRED") {
      await applyOutcomeAction(row, "CAR_EXPIRED");
      return;
    }
    if (actionKey === "POLICY_FROM_ELSEWHERE") {
      await applyOutcomeAction(row, "POLICY_FROM_ELSEWHERE");
      return;
    }
    if (actionKey === "RENEW_NEXT_YEAR") {
      setRenewReminderModal({ open: true, row, date: null });
      return;
    }
  };

  const deleteRow = (row) => {
    const id = getCaseId(row);
    if (!id) return;
    Modal.confirm({
      title: "Delete renewal case?",
      content: "This will permanently delete this insurance case.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await insuranceApi.delete(id);
          message.success("Case deleted");
          await load();
        } catch (err) {
          message.error(err?.message || "Failed to delete case");
        }
      },
    });
  };

  const clearRenewalFilters = () => {
    setSearch("");
    setWindowFilter("all");
    setPolicyStatusFilter("all");
    setTierFilter("all");
    setStatusFilter("all");
    setVehicleTypeFilter("all");
    setSourceFilter("all");
    setSelectedStatCard("all");
    setViewTab("all");
  };

  return (
    <InsuranceAntdProvider>
    <div
      className="min-h-screen px-4 py-4 insurance-antd-page"
      style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%)" }}
    >
      <div className="mx-auto max-w-[1920px] space-y-4">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Insurance Workspace
            </p>
            <h2 className="mt-0.5 text-2xl font-black text-slate-900">
              Renewal Dashboard
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Pending renewals (expiry next 365 days or expired last 365 days)
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {statCards.map((card) => {
              const active = isCardActive(card.key);
              const CardIcon = card.icon;
              return (
                <motion.button
                  key={card.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleStatCardClick(card.key)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 text-left w-full ${
                    active ? card.activeBg : `${card.inactiveBg} ${card.borderColor}`
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                    active
                      ? "bg-white/20 border-white/10 text-white"
                      : `${card.bg} ${card.borderColor} ${card.color}`
                  }`}>
                    <CardIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${active ? card.labelActive : card.labelInactive}`}>
                      {card.label}
                    </div>
                    <div className="ins-num mt-0.5 text-lg font-black leading-none">
                      {card.count}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search case, customer, vehicle, policy or mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 py-2.5 pl-10 pr-10 font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="ins-search-clear"
                  onClick={() => setSearch("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={load}
              aria-label="Refresh cases"
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={clearRenewalFilters}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-300"
            >
              Clear
            </motion.button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={windowFilter}
              onChange={(e) => onWindowChange(e.target.value)}
            >
              <option value="all">Expiration: All</option>
              <option value="7d">7 Days</option>
              <option value="14d">14 Days</option>
              <option value="30d">30 Days</option>
              <option value="45d">45 Days</option>
              <option value="60d">60 Days</option>
              <option value="gt60d">&gt; 60 Days</option>
              <option value="expired">Expired</option>
            </select>
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={policyStatusFilter}
              onChange={(e) => onPolicyStatusChange(e.target.value)}
            >
              <option value="all">Policy Status: All</option>
              {POLICY_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "Pending" ? "Expiry Not Captured" : item}
                </option>
              ))}
            </select>
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={statusFilter}
              onChange={(e) => onLeadStatusChange(e.target.value)}
            >
              <option value="all">Lead Status: All</option>
              {LEAD_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={tierFilter}
              onChange={(e) => onTierChange(e.target.value)}
            >
              <option value="all">Tier: All</option>
              <option value="high-value">High-Value (&gt; ₹50K)</option>
              <option value="premium">Premium (₹20K - ₹50K)</option>
              <option value="basic">Basic (&lt; ₹20K)</option>
            </select>
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
            >
              <option value="all">Vehicle Type: All</option>
              <option value="New Car">New Car</option>
              <option value="Used Car">Used Car</option>
            </select>
            <select
              className="ins-filter-select h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">Source: All</option>
              <option value="Direct">Direct</option>
              <option value="Indirect">Indirect</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="ins-num text-xs font-semibold text-slate-500">
              Showing {filteredCases.length} of {cases.length} cases
            </p>
            {loading && cases.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <RefreshCw size={12} className="animate-spin" />
                Updating…
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {loading &&
              !cases.length &&
              [0, 1, 2].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-2xl border bg-white p-4"
                  style={{ borderColor: "#dbe3ee" }}
                  aria-hidden="true"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="ins-skeleton h-5 w-24" />
                    <div className="ins-skeleton h-5 w-16" />
                    <div className="ins-skeleton h-5 w-20" />
                    <div className="ins-skeleton h-5 w-16" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="space-y-2.5 rounded-2xl border p-3"
                        style={{ borderColor: "#e2e8f0" }}
                      >
                        <div className="ins-skeleton h-3 w-20" />
                        <div className="ins-skeleton h-4 w-3/4" />
                        <div className="ins-skeleton h-3 w-1/2" />
                        <div className="ins-skeleton h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            {filteredCases.map((row) => {
              const id = getCaseId(row);
              const draft = rowDrafts[id] || {};
              const status =
                draft.renewalLeadStatus ?? row.renewalLeadStatus ?? "New";
              const isRowRenewed = isRenewedRow(row);
              const policyRecord =
                row?.renewedComplete && row?.renewedPolicy
                  ? row.renewedPolicy
                  : row;
              const activePolicy = resolveActivePolicySnapshot(policyRecord);
              const previousPolicy = resolvePreviousPolicySnapshot(policyRecord);
              const previousPolicyAddons = resolvePreviousPolicyAddons(
                policyRecord,
                previousPolicy,
              );
              const days = cycleAdjustedDaysUntilExpiry(policyRecord);
              // Show the same cycle-adjusted date the "Xd left / Expired Xd
              // ago" badges are computed from, so the label never contradicts
              // the badge (e.g. a stored expiry a year out otherwise reads as
              // "Expiry: 12 Jul 2027 · Expired 8d ago").
              const cycleAdjustedExpiry = getCycleAdjustedExpiryDate(
                getPolicyPulseExpiryDate(policyRecord),
                dayjs(),
                {
                  odTenureYears: getEffectiveOdTenureYears(policyRecord),
                  policyStartDate:
                    policyRecord.newPolicyStartDate ||
                    policyRecord.previousPolicyStartDate ||
                    "",
                },
              );
              const displayExpiryLabel = cycleAdjustedExpiry
                ? cycleAdjustedExpiry.format("DD MMM YYYY")
                : activePolicy.expiryLabel || "—";
              // "Next renewal info": when the current policy is itself the
              // result of a completed renewal, the countdown must run from
              // its own activation date — not the original policy's.
              const activationDateRaw =
                policyRecord.newPolicyStartDate ||
                policyRecord.previousPolicyStartDate ||
                "";
              const activationDate = parseInsuranceDate(activationDateRaw);
              const policyPulseTone = getPolicyPulseMeta(days, isRowRenewed);
              const comment = draft.renewalComment ?? row.renewalComment ?? "";
              const primaryPaymentRow = buildInsurancePaymentTimeline(
                policyRecord,
              )[0] || { amount: 0 };
              const { referenceName, referencePhone } =
                resolveInsuranceReference(row);
              const snap = row.customerSnapshot || {};
              const buyerType = String(
                row.buyerType || snap.buyerType || "Individual",
              )
                .trim()
                .toLowerCase();
              const isCompany = buyerType === "company";

              const companyName = isCompany
                ? (row.companyName || snap.companyName || "")
                : "";
              const contactPerson = isCompany
                ? (row.contactPersonName || snap.contactPersonName || "")
                : "";
              const customerName =
                resolveInsuranceCustomerDisplay({
                  customerName: row.customerName || snap.customerName || "",
                  companyName,
                  contactPersonName: contactPerson,
                  sourceName: row.sourceName,
                  dealerChannelName: row.dealerChannelName,
                }) ||
                row.customerName ||
                snap.customerName ||
                "—";
              const sourceIdentity = String(
                row.sourceName ||
                row.dealerChannelName ||
                row.referenceName ||
                "",
              )
                .trim()
                .toLowerCase();
              const customerIdentity = String(customerName || "")
                .trim()
                .toLowerCase();
              const customerLooksLikeSource =
                Boolean(sourceIdentity) && sourceIdentity === customerIdentity;
              const customerLooksLikeChannelAlias =
                /(broker|broking|dealer|agency|channel|dsa|pos|crm)/i.test(
                  String(customerName || ""),
                );
              const displayName =
                buyerType === "company"
                  ? companyName || contactPerson || customerName || "—"
                  : customerLooksLikeSource || customerLooksLikeChannelAlias
                    ? contactPerson || customerName || companyName || "—"
                    : customerName || contactPerson || companyName || "—";

              const mobile = snap.primaryMobile || row.mobile || "—";
              const source = getRenewalSource(row);
              const isIndirectSource = source.toLowerCase() === "indirect";
              const policyDoneByRaw = String(
                row.policyDoneBy || row.policy_done_by || "",
              ).trim();
              const policyDoneByLower = policyDoneByRaw.toLowerCase();
              const policyDoneByLabel = policyDoneByRaw || "—";
              const brokerName = String(row.brokerName || "").trim();
              const showroomName = String(row.showroomName || "").trim();
              const dealerChannelName = String(row.dealerChannelName || "").trim();
              const vehicleYear = getVehicleDisplayYear(row);

              const channelPartnerName =
                policyDoneByLower === "broker"
                  ? brokerName
                  : policyDoneByLower === "showroom"
                    ? showroomName
                    : "";

              const sourceDetailsName = isIndirectSource
                ? dealerChannelName || referenceName
                : "";

              const sourceDetailsContact = isIndirectSource
                ? String(
                    row.dealerChannelMobile ||
                    row.dealerChannelContact ||
                    row.sourceContactNumber ||
                    "",
                  ).trim()
                : "";

              const channelDealerNo =
                row.channelDealerNo ||
                row.channel_dealer_no ||
                row.channelDealerNumber ||
                row.dealerChannelNumber ||
                row.dealer_channel_number ||
                "";

              const vehicle = [
                row.vehicleMake,
                row.vehicleModel,
                row.vehicleVariant,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();
              const vehicleLabel = vehicle || "—";
              const reg = row.registrationNumber || row.vehicleNumber || "";
              const policyOriginType = getPolicyOriginType(row);
              const vehicleOwnershipBadge = getRenewalVehicleType(row);
              const ownershipLower = String(vehicleOwnershipBadge || "")
                .trim()
                .toLowerCase();
              const leftAccentColor = ownershipLower.includes("new")
                ? "#2563eb"
                : "#16a34a";
              const statusChipClass =
                status === "Closed"
                  ? "bg-rose-100 text-rose-700"
                  : status === "Payment Pending"
                    ? "bg-amber-100 text-amber-700"
                    : status === "Quotes Shared"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700";
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                  style={{ borderColor: "#dbe3ee" }}
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-[3px]"
                    style={{ background: leftAccentColor }}
                  />
                  <div
                    className="border-b p-4"
                    style={{ borderColor: "#f1f5f9" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {getInsuranceDisplayCaseId(row) || "—"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                          {["extended warranty", "ew policy"].includes(String(row.policyCategory || row.policyTypeSelector || "").trim().toLowerCase())
                            ? "EW Policy"
                            : (String(row.policyCategory || row.policyTypeSelector || "Insurance").replace(" Policy", ""))}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusChipClass}`}
                        >
                          {status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {row.vehicleType || "Used Car"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                          {row.typesOfVehicle || "4W"}
                        </span>
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            background: policyPulseTone.bg,
                            color: policyPulseTone.color,
                          }}
                        >
                          {Number.isFinite(days)
                            ? days < 0
                              ? `Expired ${Math.abs(days)}d ago`
                              : `${days}d left`
                            : "No expiry"}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <Tooltip title="View">
                          <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              setSelectedCase(policyRecord);
                              setPreviewStageKey(
                                policyRecord === row ? "previous" : "new",
                              );
                              setPreviewVisible(true);
                            }}
                            className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                            style={{ background: "#eef2ff", color: "#4f46e5" }}
                          >
                            <Eye size={14} />
                          </motion.button>
                        </Tooltip>
                        <Tooltip
                          title={
                            isRowRenewed
                              ? "Already renewed"
                              : row?.renewedToCaseId
                                ? "Continue renewal draft"
                                : "Convert to Renewal"
                          }
                        >
                          <motion.button
                            whileHover={isRowRenewed ? undefined : { scale: 1.06 }}
                            whileTap={isRowRenewed ? undefined : { scale: 0.96 }}
                            type="button"
                            disabled={isRowRenewed}
                            onClick={() => {
                              if (isRowRenewed) return;
                              // A renewal draft already exists for this case —
                              // resume it instead of spawning a duplicate one.
                              navigate(
                                row?.renewedToCaseId
                                  ? `/insurance/edit/${row.renewedToCaseId}`
                                  : `/insurance/new?renewFrom=${id}`,
                              );
                            }}
                            className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ background: "#ecfdf5", color: "#059669" }}
                          >
                            <RefreshCw size={14} />
                          </motion.button>
                        </Tooltip>
                        <Tooltip title="Update status">
                          <Popover
                            trigger="click"
                            placement="rightTop"
                            getPopupContainer={popupContainer}
                            overlayClassName="renewal-status-popover"
                            open={
                              String(statusActionRow?._id || "") === String(id)
                            }
                            onOpenChange={(open) =>
                              setStatusActionRow(open ? row : null)
                            }
                            content={
                              <RenewalStatusActionPanel
                                row={row}
                                draft={draft}
                                onClose={() => setStatusActionRow(null)}
                                onAction={async (actionKey) => {
                                  await runStatusAction(row, actionKey);
                                  setStatusActionRow(null);
                                }}
                              />
                            }
                          >
                            <motion.button
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                              style={{
                                background: "#eef2ff",
                                color: "#4f46e5",
                              }}
                            >
                              <ListChecks size={14} strokeWidth={2.25} />
                            </motion.button>
                          </Popover>
                        </Tooltip>
                        <Popover
                          trigger="click"
                          placement="bottomRight"
                          getPopupContainer={popupContainer}
                          content={
                            <div className="w-[260px] space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Notes
                              </p>
                              <Input.TextArea
                                value={comment}
                                rows={4}
                                placeholder="Add notes"
                                onChange={(e) =>
                                  setRowDrafts((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...prev[id],
                                      renewalComment: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          }
                        >
                          <Tooltip title="Notes">
                            <motion.button
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                              style={{
                                background: "#eff6ff",
                                color: "#1d4ed8",
                              }}
                            >
                              <NotebookPen size={14} />
                            </motion.button>
                          </Tooltip>
                        </Popover>
                        <Popconfirm
                          title="Delete case"
                          description={`Delete policy ${getInsuranceDisplayCaseId(row) || id}? This cannot be undone.`}
                          onConfirm={() => deleteRow(row)}
                          okText="Delete"
                          okType="danger"
                          cancelText="Cancel"
                        >
                          <Tooltip title="Delete">
                            <motion.button
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                              style={{
                                background: "#fff1f2",
                                color: "#e11d48",
                              }}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                    <div
                      className="border-r p-3"
                      style={{ borderColor: "#f1f5f9" }}
                    >
                      <div
                        className="rounded-2xl"
                        style={{
                          borderColor: "#e2e8f0",
                          background:
                            "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                        }}
                      >
                        <div
                          className="px-3 py-3 border-b"
                          style={{ borderColor: "#e2e8f0" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                                <CarFront size={11} />
                                Customer &amp; Vehicle
                              </p>
                              <p className="text-[13px] font-semibold text-slate-900 mt-1 truncate">
                                {displayName || "—"}
                              </p>
                              {contactPerson &&
                              contactPerson !== displayName ? (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {contactPerson}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          {/* Customer block */}
                          <div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600">
                              <Phone size={11} className="shrink-0" />
                              <span className="truncate">{mobile || "—"}</span>
                            </div>

                            <div className="mt-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">
                                  Source:
                                </span>
                                <span className="text-slate-700 font-bold">
                                  {source || "Direct"}
                                </span>
                              </div>
                              {isIndirectSource && sourceDetailsName ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="font-bold uppercase tracking-wider text-slate-400">
                                    Channel Partner:
                                  </span>
                                  <span className="truncate font-semibold text-slate-700">
                                    {[sourceDetailsName, sourceDetailsContact].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                              ) : null}
                              {referenceName || referencePhone ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="font-bold uppercase tracking-wider text-slate-400">
                                    Reference:
                                  </span>
                                  <span className="truncate font-semibold text-slate-700">
                                    {[referenceName, referencePhone].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                              ) : null}
                              {shouldShowInsuranceChannelBadge({
                                isIndirectSource,
                                channelPartnerName,
                                channelDealerNo,
                                sourceDetailsName,
                              }) &&
                                !isIndirectSource &&
                                channelPartnerName ? (
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit max-w-full border ${
                                    policyDoneByLabel?.toLowerCase() === "broker"
                                      ? "bg-amber-50 border-amber-100"
                                      : "bg-blue-50 border-blue-100"
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] font-bold truncate ${
                                      policyDoneByLabel?.toLowerCase() === "broker"
                                        ? "text-amber-700"
                                        : "text-blue-700"
                                    }`}
                                    title={`${policyDoneByLabel}: ${channelPartnerName}${channelDealerNo ? ` (#${channelDealerNo})` : ""}`}
                                  >
                                    {policyDoneByLabel}: {channelPartnerName}
                                    {channelDealerNo ? (
                                      <span className="ml-1 opacity-60">
                                        #{channelDealerNo}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-slate-100" />

                          {/* Vehicle block */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-600 mb-1">
                              Vehicle
                            </p>

                            <p
                              className="text-[13px] font-semibold text-slate-900 truncate"
                              title={vehicleLabel}
                            >
                              {vehicleLabel || "—"}
                              {vehicleYear ? (
                                <span className="text-slate-500">
                                  {" "}
                                  · {vehicleYear}
                                </span>
                              ) : null}
                            </p>
                            <p
                              className="text-[11px] text-slate-600 mt-0.5"
                              style={{ fontFamily: "var(--default-mono-font-family)" }}
                            >
                              {reg || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="cursor-pointer border-r p-3 transition-colors hover:bg-slate-50"
                      onClick={() => {
                        setPolicyModal({
                          open: true,
                          row: policyRecord,
                          isRenewed: policyRecord !== row,
                        });
                        setShowAllPolicyAddons(false);
                      }}
                      style={{ borderColor: "#f1f5f9" }}
                    >
                      <div
                        className="rounded-2xl cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
                        style={{
                          borderColor: "#e2e8f0",
                          background:
                            "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                        }}
                      >
                        <div
                          className="px-3 py-3 border-b"
                          style={{ borderColor: "#e2e8f0" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                                  <Shield size={11} />
                                  {policyRecord !== row
                                    ? "Renewed Policy"
                                    : "Previous Policy"}
                                </p>
                              </div>
                              <p className="text-[13px] font-semibold text-slate-900 mt-1 truncate">
                                {previousPolicy.insuranceCompany || "—"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {previousPolicy.policyNumber || "Not issued"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Type {previousPolicy.policyType || "—"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              NCB {Number(previousPolicy.ncbDiscount || 0)}%
                            </span>
                            {policyOriginType &&
                              policyOriginType !== "EW Policy" &&
                              row.vehicleType?.toLowerCase() !== "new car" ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">
                                {policyOriginType}
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                              Add Ons
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {previousPolicyAddons.length ? (
                                previousPolicyAddons.map((addon) => (
                                  <span
                                    key={addon.name}
                                    className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold leading-none text-emerald-700"
                                  >
                                    {addon.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  No add-ons recorded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="border-r p-3"
                      style={{ borderColor: "#f1f5f9" }}
                    >
                      <div
                        className="rounded-2xl"
                        style={{
                          borderColor: "#e2e8f0",
                          background:
                            "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div className="px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                Renewal Payment
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 truncate">
                                Total Premium
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <DollarSign size={14} />
                            </div>
                          </div>
                          <p className="ins-num mt-3 text-[22px] leading-6 font-black text-slate-900">
                            {formatInr(primaryPaymentRow.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Activity size={11} className="text-slate-500" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            Workflow
                          </p>
                        </div>
                        <span
                          className="px-3 py-1.5 rounded-full text-[11px] font-black uppercase shadow-sm"
                          style={{
                            background: policyPulseTone.bg,
                            color: policyPulseTone.color,
                            border: `1px solid ${policyPulseTone.color}44`,
                          }}
                        >
                          {policyPulseTone.label}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <motion.div className="flex justify-between">
                          <span className="text-slate-600">Policy Started</span>
                          <span className="font-semibold text-slate-900">
                            {activationDate
                              ? activationDate.format("DD MMM YYYY")
                              : row.createdAt
                                ? dayjs(row.createdAt).format("DD MMM YYYY")
                                : "—"}
                          </span>
                        </motion.div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Expiry</span>
                          <span className="font-semibold text-slate-900">
                            {displayExpiryLabel}
                          </span>
                        </div>
                      </div>
                      <div
                        className="mt-3 rounded-xl border px-2.5 py-2"
                        style={{
                          borderColor: `${policyPulseTone.color}33`,
                          background: policyPulseTone.bg,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-7 w-7 rounded-full inline-flex items-center justify-center shrink-0"
                            style={{
                              background: "#ffffff",
                              color: policyPulseTone.color,
                            }}
                          >
                            <Clock3 size={13} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                              Policy Pulse
                            </p>
                            <p
                              className="text-[11px] font-semibold truncate"
                              style={{ color: policyPulseTone.color }}
                            >
                              {policyPulseTone.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {!loading && !filteredCases.length && (
              <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Search size={24} className="text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {hasActiveRenewalFilters
                    ? "No cases match these filters"
                    : "No renewal cases yet"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {hasActiveRenewalFilters
                    ? "Try widening the expiry window or clearing a filter."
                    : "Cases due for renewal in the next 365 days will appear here."}
                </p>
                {hasActiveRenewalFilters ? (
                  <button
                    type="button"
                    onClick={clearRenewalFilters}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={renewReminderModal.open}
        title="Schedule renewal reminder"
        okText="Schedule"
        onCancel={() =>
          setRenewReminderModal({ open: false, row: null, date: null })
        }
        onOk={async () => {
          if (!renewReminderModal.date) {
            message.error("Pick a reminder date first.");
            return;
          }
          await applyOutcomeAction(renewReminderModal.row, "RENEW_NEXT_YEAR", {
            renewalFollowUpDate: renewReminderModal.date,
          });
          setRenewReminderModal({ open: false, row: null, date: null });
        }}
      >
        <p className="text-sm text-slate-600 mb-3">
          This case will be closed for the current cycle and flagged to follow
          up on the date you pick below.
        </p>
        <DatePicker
          className="w-full"
          format="DD MMM YYYY"
          getPopupContainer={popupContainer}
          disabledDate={(d) => d && d.isBefore(dayjs().startOf("day"))}
          onChange={(d) =>
            setRenewReminderModal((prev) => ({
              ...prev,
              date: d ? d.format("YYYY-MM-DD") : null,
            }))
          }
        />
      </Modal>

      <InsurancePreview
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setSelectedCase(null);
          setPreviewStageKey("previous");
        }}
        data={selectedCase}
        initialStageKey={previewStageKey}
      />

      <Modal
        open={policyModal.open}
        centered
        width={480}
        footer={null}
        onCancel={() => {
          setPolicyModal({ open: false, row: null });
          setShowAllPolicyAddons(false);
        }}
        title={
          policyModal.isRenewed
            ? "Renewed Policy Details"
            : "Previous Policy Details"
        }
      >
        {policyModal.row ? (
          (() => {
            const modalPolicy = resolvePreviousPolicySnapshot(policyModal.row);
            const ownDamage = Number(modalPolicy.ownDamage || 0);
            const ncbPercent = Number(modalPolicy.ncbDiscount || 0);
            const ncbAmount = Number(modalPolicy.ncbAmount || 0);
            const idv =
              policyModal.row?.newIdvAmount ||
              policyModal.row?.previousIdvAmount ||
              "";
            const includedAddons = resolvePreviousPolicyAddons(
              policyModal.row,
              modalPolicy,
            );
            return (
              <PremiumBreakupCard
                breakup={{
                  ownDamage,
                  ownDamageBeforeNcb: Number(modalPolicy.ownDamageBeforeNcb || 0),
                  basicOwnDamage: ownDamage,
                  ncbPercent,
                  ncbAmount,
                  thirdParty: Number(modalPolicy.thirdParty || 0),
                  basicThirdParty: Number(modalPolicy.basicThirdParty || 0),
                  addOnsTotal: Number(modalPolicy.addOnsTotal || 0),
                  totalAmount: Number(modalPolicy.totalPremium || 0),
                }}
                coverageType={modalPolicy.policyType}
                idv={idv}
                formatCurrency={(n) =>
                  Number(n || 0).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 0,
                  })
                }
                includedAddons={includedAddons}
                showAllAddons={showAllPolicyAddons}
                onToggleAddons={() =>
                  setShowAllPolicyAddons((prev) => !prev)
                }
                totalAmount={Number(modalPolicy.totalPremium || 0)}
                title={
                  policyModal.isRenewed
                    ? "Renewed Policy Premium Breakup"
                    : "Previous Policy Premium Breakup"
                }
                insurerName={modalPolicy.insuranceCompany}
                idx={0}
              />
            );
          })()
        ) : null}
      </Modal>
    </div>
    </InsuranceAntdProvider>
  );
};

export default InsuranceRenewalCasesPage;
