import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  Popover,
  Popconfirm,
  Select,
  Tooltip,
  message,
} from "antd";
import InsuranceAntdProvider from "../../components/insurance/InsuranceAntdProvider";
import "../../components/insurance/insurance-forms.css";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  Activity,
  CarFront,
  CheckCircle,
  Clock3,
  DollarSign,
  Eye,
  ListChecks,
  RefreshCw,
  Save,
  Search,
  Share2,
  Shield,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  buildInsurancePaymentTimeline,
  daysUntilExpiry,
  getPolicyPulseExpiryDate,
  getPolicyPulseMeta,
  parsePolicyIncludedAddons,
  resolveActivePolicySnapshot,
  resolveInsuranceChannelContext,
  resolveInsuranceReference,
  shouldShowInsuranceChannelBadge,
} from "../../utils/insurancePolicyDisplay";
import { insuranceApi } from "../../api/insurance";
import { getEmployees } from "../../api/employees";
import { useAuth } from "../../context/AuthContext";
import InsurancePreview from "../../components/insurance/InsurancePreview";
import PremiumBreakupCard from "../../components/insurance/PremiumBreakupCard";

const LEAD_STATUS_OPTIONS = [
  "New",
  "Follow Up",
  "Quotes Shared",
  "Payment Pending",
  "Closed",
];
const CLOSE_REASONS = [
  "Not Interested",
  "Already renewed from somewhere else",
  "Other",
];
const VIEW_TABS = [
  { key: "renewal", label: "Renewal" },
  { key: "renewed", label: "Renewed" },
  { key: "external", label: "External" },
];
const RENEWAL_STATUS_ACTION_GROUPS = [
  {
    id: "workflow",
    label: "Workflow",
    actions: [
      {
        key: "SAVE",
        label: "Save changes",
        desc: "Status, notes & assignment",
        tone: "save",
        icon: Save,
      },
      {
        key: "RENEW",
        label: "Start renewal",
        desc: "Open new renewal case",
        tone: "renew",
        icon: RefreshCw,
      },
    ],
  },
  {
    id: "quotes",
    label: "Quotes & payment",
    actions: [
      {
        key: "SHARE_QUOTES",
        label: "Share quotes",
        desc: "Mark shared & open quotes",
        tone: "share",
        icon: Share2,
      },
      {
        key: "VIEW_QUOTES",
        label: "View quotes",
        desc: "Open quote comparison",
        tone: "view",
        icon: Eye,
      },
      {
        key: "MARK_PAYMENT_PENDING",
        label: "Payment pending",
        desc: "Customer payment awaited",
        tone: "payment",
        icon: DollarSign,
      },
    ],
  },
  {
    id: "outcome",
    label: "Close & outcomes",
    actions: [
      {
        key: "CLOSE_LEAD",
        label: "Close lead",
        desc: "Set closed — then save",
        tone: "close",
        icon: XCircle,
      },
      {
        key: "ALREADY_RENEWED",
        label: "Already renewed",
        desc: "Moved to renewed list",
        tone: "renewed",
        icon: CheckCircle,
      },
      {
        key: "POLICY_FROM_ELSEWHERE",
        label: "Policy elsewhere",
        desc: "Renewed outside Autocredits",
        tone: "view",
        icon: Shield,
      },
      {
        key: "CAR_SOLD",
        label: "Car sold",
        desc: "Vehicle no longer with customer",
        tone: "sold",
        icon: CarFront,
      },
      {
        key: "CAR_EXPIRED",
        label: "Car expired",
        desc: "Policy lapsed / not renewing",
        tone: "expired",
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
  const customer =
    row?.customerName || row?.companyName || row?.contactPersonName || "—";
  const reg = row?.registrationNumber || "—";
  const activePolicy = resolveActivePolicySnapshot(row);
  const expiryLabel = activePolicy.expiryLabel || "—";

  return (
    <div className="renewal-status-panel">
      <div className="renewal-status-panel__head">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Update status
          </p>
          <p className="mt-0.5 truncate text-[15px] font-bold text-slate-900">
            {row?.caseId || "Case"}
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

const paymentSignalMeta = {
  neutral: {
    color: "#64748b",
    soft: "rgba(148, 163, 184, 0.10)",
    icon: DollarSign,
  },
  good: {
    color: "#16a34a",
    soft: "rgba(22, 163, 74, 0.10)",
    icon: CheckCircle,
  },
  warning: {
    color: "#d97706",
    soft: "rgba(217, 119, 6, 0.10)",
    icon: Activity,
  },
  accent: {
    color: "#0ea5e9",
    soft: "rgba(14, 165, 233, 0.10)",
    icon: DollarSign,
  },
};

const InsuranceRenewalCasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [odAmountRange, setOdAmountRange] = useState("all");
  const [followFrom, setFollowFrom] = useState(null);
  const [followTo, setFollowTo] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewTab, setViewTab] = useState("renewal");
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [rowDrafts, setRowDrafts] = useState({});
  const [statusActionRow, setStatusActionRow] = useState(null);
  const [timelineRow, setTimelineRow] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [previewStageKey, setPreviewStageKey] = useState("previous");
  const [policyModal, setPolicyModal] = useState({ open: false, row: null });
  const [showAllPolicyAddons, setShowAllPolicyAddons] = useState(false);
  const popupContainer = (node) => node?.parentElement || document.body;
  const onPolicyStatusChange = (value) =>
    setPolicyStatusFilter(String(value || "all"));
  const onLeadStatusChange = (value) => setStatusFilter(String(value || "all"));
  const onAssignedChange = (value) => setAssignedFilter(String(value || "all"));
  const onOdRangeChange = (value) => setOdAmountRange(String(value || "all"));
  const [summary, setSummary] = useState({
    activeCases: 0,
    policiesPending: 0,
    paymentPending: 0,
    pendingRenewals: 0,
    renewed: 0,
    external: 0,
  });

  const role = String(user?.role || "").toLowerCase();
  const isAdminLike = [
    "superadmin",
    "admin",
    "team_lead",
    "insurance_team_lead",
  ].includes(role);
  const canViewAllRenewals = ["superadmin", "admin"].includes(role);
  const meId = String(user?._id || user?.id || "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, employeesRes, summaryRes] = await Promise.all([
        insuranceApi.getRenewalCases({
          view: viewTab,
          futureDays: 365,
          pastDays: 365,
          ...(canViewAllRenewals
            ? {}
            : { assignedOnly: 1, assignedToId: meId }),
          ...(odAmountRange !== "all" ? { odAmountRange } : {}),
        }),
        getEmployees(),
        insuranceApi.getRenewalSummary(),
      ]);
      const rows = Array.isArray(casesRes?.data)
        ? casesRes.data
        : Array.isArray(casesRes?.items)
          ? casesRes.items
          : [];
      // Backend already applies renewal-window + workflow visibility.
      // Avoid re-filtering here, otherwise Renewed/External or edge rows can disappear.
      setCases(rows);
      setEmployees(Array.isArray(employeesRes) ? employeesRes : []);
      setSummary(summaryRes?.data || {});
    } catch (err) {
      message.error(err?.message || "Failed to load renewal cases");
    } finally {
      setLoading(false);
    }
  }, [canViewAllRenewals, meId, odAmountRange, viewTab]);

  React.useEffect(() => {
    load();
  }, [load]);

  const assigneeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      const id = String(emp?._id || emp?.id || "");
      if (!id) return;
      map.set(id, emp);
    });
    return map;
  }, [employees]);

  const filteredCases = useMemo(() => {
    let rows = [...cases];

    if (activeTab === "non-assigned") {
      rows = rows.filter((row) => !row?.renewalAssignedToId);
    } else if (activeTab === "assigned") {
      rows = rows.filter((row) => row?.renewalAssignedToId);
    }
    if (!canViewAllRenewals) {
      rows = rows.filter(
        (row) => String(row?.renewalAssignedToId || "") === String(meId),
      );
    }

    if (policyStatusFilter !== "all") {
      rows = rows.filter((row) => {
        const days = daysUntilExpiry(row);
        if (!Number.isFinite(days)) return false;
        return policyStatusFilter === "expired" ? days < 0 : days >= 0;
      });
    }

    if (assignedFilter !== "all") {
      if (assignedFilter === "none") {
        rows = rows.filter((row) => !row?.renewalAssignedToId);
      } else {
        rows = rows.filter(
          (row) => String(row?.renewalAssignedToId || "") === assignedFilter,
        );
      }
    }

    if (statusFilter !== "all") {
      rows = rows.filter(
        (row) =>
          String(row?.renewalLeadStatus || "New").toLowerCase() ===
          statusFilter.toLowerCase(),
      );
    }
    if (odAmountRange !== "all") {
      rows = rows.filter((row) => {
        const value = Number(resolveActivePolicySnapshot(row).ownDamage || 0);
        if (!Number.isFinite(value) || value < 0) return false;
        if (odAmountRange === "lt10k") return value < 10000;
        if (odAmountRange === "10k-20k")
          return value >= 10000 && value <= 20000;
        if (odAmountRange === "gt20k") return value > 20000;
        return true;
      });
    }

    if (followFrom || followTo) {
      rows = rows.filter((row) => {
        const date = parseDate(row?.renewalFollowUpDate);
        if (!date) return false;
        if (followFrom && date.isBefore(followFrom.startOf("day")))
          return false;
        if (followTo && date.isAfter(followTo.endOf("day"))) return false;
        return true;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const bag = [
          row?.registrationNumber,
          row?.customerName,
          row?.companyName,
          row?.contactPersonName,
          row?.mobile,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return bag.includes(q);
      });
    }

    return rows.sort((a, b) => {
      const aFollow = parseDate(a?.renewalFollowUpDate);
      const bFollow = parseDate(b?.renewalFollowUpDate);
      if (aFollow && bFollow) return aFollow.valueOf() - bFollow.valueOf();
      if (aFollow && !bFollow) return -1;
      if (!aFollow && bFollow) return 1;

      const aDays = daysUntilExpiry(a);
      const bDays = daysUntilExpiry(b);
      const aNum = Number.isFinite(aDays) ? aDays : Number.POSITIVE_INFINITY;
      const bNum = Number.isFinite(bDays) ? bDays : Number.POSITIVE_INFINITY;
      if (aNum !== bNum) return aNum - bNum;
      const aDate = parseDate(getPolicyPulseExpiryDate(a));
      const bDate = parseDate(getPolicyPulseExpiryDate(b));
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.valueOf() - bDate.valueOf();
    });
  }, [
    activeTab,
    assignedFilter,
    cases,
    followFrom,
    followTo,
    isAdminLike,
    meId,
    policyStatusFilter,
    search,
    statusFilter,
    odAmountRange,
  ]);

  const pendingCount = cases.length;
  const nonAssignedCount = cases.filter(
    (row) => !row?.renewalAssignedToId,
  ).length;
  const assignedToMeCount = cases.filter(
    (row) => String(row?.renewalAssignedToId || "") === meId,
  ).length;

  const selectedAll =
    filteredCases.length > 0 && selectedIds.length === filteredCases.length;

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredCases.map((row) => getCaseId(row)));
  };

  const toggleSelect = (caseId) => {
    setSelectedIds((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId],
    );
  };

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

  const assignSelected = async () => {
    if (!assigneeId || selectedIds.length === 0) return;
    setAssigning(true);
    try {
      const assignee = assigneeMap.get(assigneeId);
      await insuranceApi.assignRenewalCases({
        caseIds: selectedIds,
        assigneeId,
        assigneeName: assignee?.name || "",
        assignedBy: user?.name || "",
      });
      message.success("Renewal cases assigned");
      setAssignModalOpen(false);
      setAssigneeId("");
      setSelectedIds([]);
      await load();
    } catch (err) {
      message.error(err?.message || "Failed to assign cases");
    } finally {
      setAssigning(false);
    }
  };

  const applyOutcomeAction = async (row, action) => {
    const id = getCaseId(row);
    if (!id) return;
    try {
      await insuranceApi.updateRenewalLead(id, {
        action,
        updatedBy: user?.name || "User",
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
    setPolicyStatusFilter("all");
    setAssignedFilter("all");
    setStatusFilter("all");
    setOdAmountRange("all");
    setFollowFrom(null);
    setFollowTo(null);
    if (isAdminLike) setActiveTab("all");
    setViewTab("renewal");
  };

  return (
    <InsuranceAntdProvider>
    <div
      className="min-h-screen px-4 py-4 insurance-antd-page"
      style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%)" }}
    >
      <div className="mx-auto max-w-[1920px] space-y-4">
        <style>{`
          .renewal-status-panel {
            width: min(100vw - 2rem, 340px);
            overflow: hidden;
          }
          .renewal-status-panel__head {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.875rem 1rem 0.625rem;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          }
          .renewal-status-panel__close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #fff;
            color: #64748b;
            flex-shrink: 0;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .renewal-status-panel__close:hover {
            background: #f1f5f9;
            color: #0f172a;
          }
          .renewal-status-panel__meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 1rem 0.75rem;
            border-bottom: 1px solid #f1f5f9;
          }
          .renewal-status-panel__badge {
            display: inline-flex;
            align-items: center;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .renewal-status-panel__meta-item {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            padding: 0.15rem 0.45rem;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .renewal-status-panel__body {
            max-height: min(70vh, 420px);
            overflow-y: auto;
            padding: 0.5rem;
          }
          .renewal-status-panel__section {
            padding: 0.35rem 0.25rem 0.5rem;
          }
          .renewal-status-panel__section + .renewal-status-panel__section {
            margin-top: 0.25rem;
            padding-top: 0.5rem;
            border-top: 1px solid #f1f5f9;
          }
          .renewal-status-panel__section-label {
            margin: 0 0 0.4rem 0.35rem;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #94a3b8;
          }
          .renewal-status-panel__actions {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }
          .renewal-status-action {
            display: flex;
            align-items: flex-start;
            gap: 0.625rem;
            width: 100%;
            text-align: left;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 0.55rem 0.65rem;
            background: #fff;
            transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
          }
          .renewal-status-action:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
            border-color: #cbd5e1;
          }
          .renewal-status-action:active {
            transform: translateY(0);
          }
          .renewal-status-action__icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 10px;
            flex-shrink: 0;
          }
          .renewal-status-action__text {
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
            min-width: 0;
          }
          .renewal-status-action__label {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.25;
          }
          .renewal-status-action__desc {
            font-size: 10px;
            font-weight: 500;
            color: #64748b;
            line-height: 1.3;
          }
          .tone-save { background: #f1f5f9; color: #334155; }
          .tone-share { background: #dbeafe; color: #1d4ed8; }
          .tone-view { background: #ede9fe; color: #6d28d9; }
          .tone-payment { background: #fef3c7; color: #b45309; }
          .tone-renew { background: #dcfce7; color: #15803d; }
          .tone-close { background: #ffe4e6; color: #be123c; }
          .tone-renewed { background: #cffafe; color: #0e7490; }
          .tone-sold { background: #ffedd5; color: #c2410c; }
          .tone-expired { background: #fee2e2; color: #b91c1c; }
          .chip-save { border-color: #e2e8f0; }
          .chip-share { border-color: #bfdbfe; }
          .chip-view { border-color: #ddd6fe; }
          .chip-payment { border-color: #fde68a; }
          .chip-renew { border-color: #bbf7d0; }
          .chip-close { border-color: #fecdd3; }
          .chip-renewed { border-color: #a5f3fc; }
          .chip-sold { border-color: #fed7aa; }
          .chip-expired { border-color: #fecaca; }
          .renewal-status-popover .ant-popover-inner {
            padding: 0 !important;
            border-radius: 14px !important;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14) !important;
          }
          .renewal-status-popover .ant-popover-inner-content {
            padding: 0 !important;
          }
        `}</style>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-[0_2px_10px_rgba(148,163,184,0.12)] sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 px-3 py-2 text-center">
                <p className="text-[12px] text-slate-500">Pending</p>
                <p className="text-[17px] font-extrabold text-slate-900">
                  {pendingCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2 text-center">
                <p className="text-[12px] text-slate-500">Non-assigned</p>
                <p className="text-[17px] font-extrabold text-amber-600">
                  {nonAssignedCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2 text-center">
                <p className="text-[12px] text-slate-500">Assigned to me</p>
                <p className="text-[17px] font-extrabold text-blue-600">
                  {assignedToMeCount}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Active Cases</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.activeCases || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Policies Pending</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.policiesPending || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Payment Pending</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.paymentPending || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Pending Renewals</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.pendingRenewals || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">Renewed</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.renewed || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">External</div>
              <div className="text-base font-bold text-slate-900">
                {Number(summary?.external || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewTab(tab.key)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  viewTab === tab.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {isAdminLike &&
              ["non-assigned", "assigned", "all"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab === "non-assigned"
                    ? "Non-Assigned"
                    : tab === "assigned"
                      ? "Assigned"
                      : "All"}
                </button>
              ))}
          </div>

          <div className="mb-3 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search Reg no / Name / Mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 py-2.5 pl-10 pr-4 font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-400 focus:outline-none"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={load}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <RefreshCw size={16} />
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
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
              value={policyStatusFilter}
              onChange={(e) => onPolicyStatusChange(e.target.value)}
            >
              <option value="all">Policy Status: All</option>
              <option value="not-expired">Not expired</option>
              <option value="expired">Already expired</option>
            </select>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
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
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
              value={assignedFilter}
              onChange={(e) => onAssignedChange(e.target.value)}
            >
              <option value="all">Assigned: All</option>
              <option value="none">Not Assigned</option>
              {employees.map((emp) => {
                const value = String(emp?._id || emp?.id || "");
                return (
                  <option key={value} value={value}>
                    {emp?.name || emp?.email || "User"}
                  </option>
                );
              })}
            </select>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
              value={odAmountRange}
              onChange={(e) => onOdRangeChange(e.target.value)}
            >
              <option value="all">OD Amount: All</option>
              <option value="lt10k">OD &lt; 10K</option>
              <option value="10k-20k">OD 10K - 20K</option>
              <option value="gt20k">OD &gt; 20K</option>
            </select>
            <DatePicker
              className="h-9 rounded-lg border-slate-200"
              placeholder="Follow-up from"
              value={followFrom}
              onChange={setFollowFrom}
            />
            <DatePicker
              className="h-9 rounded-lg border-slate-200"
              placeholder="Follow-up to"
              value={followTo}
              onChange={setFollowTo}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAdminLike && (
                <>
                  <Button onClick={toggleSelectAll}>
                    {selectedAll ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    type="primary"
                    disabled={selectedIds.length === 0}
                    onClick={() => setAssignModalOpen(true)}
                  >
                    Assign Task ({selectedIds.length})
                  </Button>
                </>
              )}
            </div>
            <Button onClick={load} loading={loading}>
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredCases.map((row) => {
              const id = getCaseId(row);
              const draft = rowDrafts[id] || {};
              const status =
                draft.renewalLeadStatus ?? row.renewalLeadStatus ?? "New";
              const assignedTo = row.renewalAssignedToName || "Not Assigned";
              const activePolicy = resolveActivePolicySnapshot(row);
              const days = activePolicy.expiryDays;
              const policyPulseTone = getPolicyPulseMeta(
                days,
                viewTab === "renewed",
              );
              const comment = draft.renewalComment ?? row.renewalComment ?? "";
              const paymentTimeline = buildInsurancePaymentTimeline(row);
              const primaryPaymentRow = paymentTimeline[0] || {
                label: "Total Premium",
                amount: 0,
                type: "neutral",
              };
              const secondaryPaymentRows = paymentTimeline.slice(1);
              const paymentBaseAmount = Math.max(
                1,
                Number(primaryPaymentRow.amount || 0),
              );
              const hasPaymentActivity = secondaryPaymentRows.some(
                (item) => Number(item.amount || 0) > 0,
              );
              const sourceLabel = String(
                row?.source || row?.sourceOrigin || "",
              ).trim();
              const { referenceName, referencePhone } =
                resolveInsuranceReference(row);
              const channelCtx = resolveInsuranceChannelContext(row);
              const contactPersonName = row?.contactPersonName || "";
              const lifecycleBadge =
                viewTab === "renewed" ? "Completed" : status || "Active";
              const vehicleOwnershipBadge = row?.vehicleType || "Used Car";
              const wheelTypeBadge = row?.typesOfVehicle || "Four Wheeler";
              const ownershipLower = String(vehicleOwnershipBadge || "")
                .trim()
                .toLowerCase();
              const leftAccentColor = ownershipLower.includes("new")
                ? "#2563eb"
                : "#16a34a";
              const timelinePreview = (
                Array.isArray(row?.renewalTimeline) ? row.renewalTimeline : []
              )
                .slice()
                .reverse()
                .slice(0, 2);
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
                        {isAdminLike && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleSelect(id)}
                          />
                        )}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {row.caseId || "—"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusChipClass}`}
                        >
                          {status}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            row?.renewalAssignedToId
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {row?.renewalAssignedToId
                            ? `Assigned: ${assignedTo}`
                            : "Not Assigned"}
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
                        <Select
                          size="small"
                          value={status}
                          className="min-w-[140px]"
                          options={LEAD_STATUS_OPTIONS.map((x) => ({
                            label: x,
                            value: x,
                          }))}
                          onChange={(value) =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], renewalLeadStatus: value },
                            }))
                          }
                        />
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <Tooltip title="View">
                          <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              setSelectedCase(row);
                              setPreviewStageKey("previous");
                              setPreviewVisible(true);
                            }}
                            className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                            style={{ background: "#eef2ff", color: "#4f46e5" }}
                          >
                            <Eye size={14} />
                          </motion.button>
                        </Tooltip>
                        <Tooltip title="Renew">
                          <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() =>
                              navigate(`/insurance/new?renewFrom=${id}`)
                            }
                            className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
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
                              N
                            </motion.button>
                          </Tooltip>
                        </Popover>
                        <Popconfirm
                          title="Delete case"
                          description={`Delete policy ${row.caseId || id}? This cannot be undone.`}
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
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {lifecycleBadge}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              {vehicleOwnershipBadge}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {wheelTypeBadge}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                                <CarFront size={11} />
                                Customer &amp; Vehicle
                              </p>
                              <p className="text-[13px] font-semibold text-slate-900 mt-1 truncate">
                                {row.customerName || row.companyName || "—"}
                              </p>
                              {contactPersonName &&
                              contactPersonName !==
                                (row.customerName || row.companyName || "") ? (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {contactPersonName}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      <div className="p-3 space-y-3">
                          <div>
                            <p className="text-[11px] text-slate-600">
                              {row.mobile || "—"}
                            </p>
                            <div className="mt-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">
                                  Source:
                                </span>
                                <span className="text-slate-700 font-bold">
                                  {sourceLabel || channelCtx.source || "Direct"}
                                </span>
                              </div>
                              {referenceName || referencePhone ? (
                                <div className="space-y-1">
                                  {referenceName ? (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                      <span className="font-bold uppercase tracking-wider text-slate-400">
                                        Reference:
                                      </span>
                                      <span className="truncate font-semibold text-slate-700">
                                        {referenceName}
                                      </span>
                                    </div>
                                  ) : null}
                                  {referencePhone ? (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                      <span className="font-bold uppercase tracking-wider text-slate-400">
                                        Ref No:
                                      </span>
                                      <span className="truncate font-semibold text-slate-700 font-mono">
                                        {referencePhone}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {shouldShowInsuranceChannelBadge(channelCtx) &&
                              channelCtx.isIndirectSource &&
                              channelCtx.sourceDetailsName ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg w-fit max-w-full">
                                  <span
                                    className="text-[10px] font-bold text-indigo-700 truncate"
                                    title={`${channelCtx.sourceDetailsName}${channelCtx.channelDealerNo ? ` (#${channelCtx.channelDealerNo})` : ""}`}
                                  >
                                    Dealer: {channelCtx.sourceDetailsName}
                                    {channelCtx.channelDealerNo ? (
                                      <span className="ml-1 opacity-60">
                                        #{channelCtx.channelDealerNo}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              ) : null}
                              {shouldShowInsuranceChannelBadge(channelCtx) &&
                              !channelCtx.isIndirectSource &&
                              channelCtx.channelPartnerName ? (
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit max-w-full border ${
                                    channelCtx.policyDoneByLabel
                                      ?.toLowerCase()
                                      .includes("broker")
                                      ? "bg-amber-50 border-amber-100"
                                      : "bg-blue-50 border-blue-100"
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] font-bold truncate ${
                                      channelCtx.policyDoneByLabel
                                        ?.toLowerCase()
                                        .includes("broker")
                                        ? "text-amber-700"
                                        : "text-blue-700"
                                    }`}
                                  >
                                    {channelCtx.policyDoneByLabel}:{" "}
                                    {channelCtx.channelPartnerName}
                                    {channelCtx.channelDealerNo ? (
                                      <span className="ml-1 opacity-60">
                                        #{channelCtx.channelDealerNo}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="h-px bg-slate-100" />
                          <div>
                            <p className="text-[11px] font-semibold text-slate-600 mb-1">
                              Vehicle
                            </p>
                            <p className="text-[13px] font-semibold text-slate-900 truncate">
                              {[row.vehicleMake, row.vehicleModel, row.vehicleVariant]
                                .filter(Boolean)
                                .join(" ") || "—"}
                              {row.manufactureYear ? (
                                <span className="text-slate-500">
                                  {" "}
                                  · {row.manufactureYear}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {row.registrationNumber || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="cursor-pointer border-r p-3 transition-colors hover:bg-slate-50"
                      onClick={() => {
                        setPolicyModal({ open: true, row });
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
                                  Policy
                                </p>
                              </div>
                              <p className="text-[13px] font-semibold text-slate-900 mt-1 truncate">
                                {activePolicy.insuranceCompany || "—"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {activePolicy.policyNumber || "Not issued"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Type {activePolicy.policyType || "—"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              NCB {Number(activePolicy.ncbDiscount || 0)}%
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-500 truncate">
                              Expiry: {activePolicy.expiryLabel || "—"}
                              {Number.isFinite(days)
                                ? days < 0
                                  ? ` · Expired ${Math.abs(days)}d ago`
                                  : ` · ${days}d left`
                                : ""}
                            </p>
                            {activePolicy.odExpiryDate &&
                            activePolicy.odExpiryDate !==
                              activePolicy.expiryDate ? (
                              <p className="text-[11px] text-slate-500 truncate">
                                OD Expiry:{" "}
                                {dayjs(activePolicy.odExpiryDate).format(
                                  "DD MMM YYYY",
                                )}
                              </p>
                            ) : null}
                            {activePolicy.tpExpiryDate &&
                            activePolicy.tpExpiryDate !==
                              activePolicy.expiryDate ? (
                              <p className="text-[11px] text-slate-500 truncate">
                                TP Expiry:{" "}
                                {dayjs(activePolicy.tpExpiryDate).format(
                                  "DD MMM YYYY",
                                )}
                              </p>
                            ) : null}
                            <p className="text-[11px] text-slate-500 truncate">
                              Premium: {formatInr(activePolicy.totalPremium)}
                            </p>
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
                        <div
                          className="px-3 py-3 border-b"
                          style={{ borderColor: "#e2e8f0" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                Payment Engine
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 truncate">
                                {primaryPaymentRow.label}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <DollarSign size={14} />
                            </div>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <p className="text-[22px] leading-6 font-black text-slate-900">
                              {formatInr(primaryPaymentRow.amount)}
                            </p>
                          </div>
                          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: "100%",
                                background:
                                  "linear-gradient(90deg, #38bdf8 0%, #818cf8 55%, #22c55e 100%)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          {hasPaymentActivity ? (
                            secondaryPaymentRows.map((item, idx) => {
                              const meta =
                                paymentSignalMeta[item.type] ||
                                paymentSignalMeta.neutral;
                              const Icon = meta.icon;
                              const isSubventionRow = String(item.label || "")
                                .toLowerCase()
                                .includes("subvention");
                              const rowBase = Number(
                                item.progressBase || paymentBaseAmount || 0,
                              );
                              const rawRatio =
                                rowBase > 0
                                  ? (Number(item.amount || 0) / rowBase) * 100
                                  : 0;
                              const ratio =
                                isSubventionRow && Number(item.amount || 0) > 0
                                  ? 100
                                  : Math.max(
                                      0,
                                      Math.min(100, Math.round(rawRatio)),
                                    );
                              return (
                              <motion.div
                                key={`${id}-pay-${idx}`}
                                whileHover={{ x: 2, y: -1 }}
                                transition={{ duration: 0.16 }}
                                className="relative"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="relative pt-0.5">
                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center border"
                                      style={{
                                        background: meta.soft,
                                        borderColor: `${meta.color}33`,
                                        color: meta.color,
                                      }}
                                    >
                                      <Icon size={13} />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-semibold text-slate-900 leading-4">
                                          {item.label}
                                        </p>
                                      </div>
                                      <div className="shrink-0">
                                        <span
                                          className="text-[12px] font-black whitespace-nowrap"
                                          style={{ color: meta.color }}
                                        >
                                          {formatInr(item.amount)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${ratio}%` }}
                                          transition={{
                                            duration: 0.45,
                                            ease: "easeOut",
                                          }}
                                          className="h-full rounded-full"
                                          style={{
                                            background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}cc 100%)`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                              );
                            })
                          ) : (
                            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-4 text-center">
                              <p className="text-[12px] font-medium text-slate-500">
                                No payment activity
                              </p>
                            </div>
                          )}
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
                          <span className="text-slate-600">Created</span>
                          <span className="font-semibold text-slate-900">
                            {row.createdAt
                              ? dayjs(row.createdAt).format("DD MMM YYYY")
                              : "—"}
                          </span>
                        </motion.div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Expiry</span>
                          <span className="font-semibold text-slate-900">
                            {activePolicy.expiryLabel || "—"}
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
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Lead Timeline
                        </p>
                        <div className="mt-1.5 space-y-1.5">
                          {timelinePreview.length > 0 ? (
                            timelinePreview.map((item, idx) => (
                              <div
                                key={`${item?.at || "timeline"}-${idx}`}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                              >
                                <div className="text-[10px] text-slate-500">
                                  {item?.at
                                    ? dayjs(item.at).format("DD MMM, hh:mm A")
                                    : "—"}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-700">
                                  {item?.status || "Updated"}
                                </div>
                                {item?.comment ? (
                                  <div className="text-[10px] text-slate-600 truncate">
                                    {item.comment}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500">
                              No timeline updates yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {status === "Closed" ? (
                    <div
                      className="grid grid-cols-1 gap-3 border-t p-3 md:grid-cols-3"
                      style={{ borderColor: "#f1f5f9" }}
                    >
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Closed Reason
                        </p>
                        <Select
                          className="w-full"
                          size="small"
                          placeholder="Closed reason"
                          value={
                            draft.renewalClosedReason ?? row.renewalClosedReason
                          }
                          options={CLOSE_REASONS.map((x) => ({
                            label: x,
                            value: x,
                          }))}
                          onChange={(value) =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], renewalClosedReason: value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
            {!filteredCases.length && (
              <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">
                No renewal cases found
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={assignModalOpen}
        title="Assign Renewal Cases"
        onCancel={() => setAssignModalOpen(false)}
        onOk={assignSelected}
        confirmLoading={assigning}
        okText="Assign"
      >
        <Select
          showSearch
          size="large"
          className="w-full"
          placeholder="Search executive by name/email"
          value={assigneeId || undefined}
          onChange={setAssigneeId}
          options={employees.map((emp) => ({
            label: `${emp?.name || "User"} (${emp?.email || "no-email"})`,
            value: String(emp?._id || emp?.id || ""),
          }))}
          filterOption={(input, option) =>
            String(option?.label || "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
      </Modal>

      <Modal
        open={Boolean(timelineRow)}
        title="Lead Timeline"
        footer={null}
        onCancel={() => setTimelineRow(null)}
      >
        <div className="space-y-2">
          {(Array.isArray(timelineRow?.renewalTimeline)
            ? timelineRow.renewalTimeline
            : []
          )
            .slice()
            .reverse()
            .map((item, idx) => (
              <div key={`${item?.at || idx}`} className="rounded border p-2">
                <div className="text-xs text-slate-500">
                  {item?.at
                    ? dayjs(item.at).format("DD MMM YYYY, hh:mm A")
                    : "—"}{" "}
                  · {item?.by || "User"}
                </div>
                {item?.event ? (
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {String(item.event).replaceAll("_", " ")}
                  </div>
                ) : null}
                <div className="text-sm font-semibold">
                  {item?.status || "—"}
                </div>
                {item?.comment ? (
                  <div className="text-sm text-slate-700">{item.comment}</div>
                ) : null}
                {item?.closedReason ? (
                  <div className="text-xs text-rose-600">
                    Closed Reason: {item.closedReason}
                  </div>
                ) : null}
              </div>
            ))}
          {!timelineRow?.renewalTimeline?.length && (
            <div className="text-sm text-slate-500">
              No timeline updates yet.
            </div>
          )}
        </div>
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
          <div className="pr-6">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Premium Breakup
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {policyModal.row
                ? resolveActivePolicySnapshot(policyModal.row).insuranceCompany ||
                  "Insurance Company"
                : "Insurance Company"}
            </p>
          </div>
        }
      >
        {policyModal.row ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            {(() => {
              const modalPolicy = resolveActivePolicySnapshot(policyModal.row);
              const ownDamage = Number(modalPolicy.ownDamage || 0);
              const ncbPercent = Number(modalPolicy.ncbDiscount || 0);
              const ncbAmount = Number(modalPolicy.ncbAmount || 0);
              const includedAddons = parsePolicyIncludedAddons(
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
              title="Premium Breakup"
            />
              );
            })()}
          </div>
        ) : null}
      </Modal>
    </div>
    </InsuranceAntdProvider>
  );
};

export default InsuranceRenewalCasesPage;
