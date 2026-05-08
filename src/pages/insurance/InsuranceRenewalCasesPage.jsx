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
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  Activity,
  CarFront,
  DollarSign,
  Eye,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
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
const ACTION_CHIPS = [
  { key: "SAVE", label: "Save", tone: "save" },
  { key: "SHARE_QUOTES", label: "Share Quotes", tone: "share" },
  { key: "VIEW_QUOTES", label: "View Quotes", tone: "view" },
  {
    key: "MARK_PAYMENT_PENDING",
    label: "Mark Payment Pending",
    tone: "payment",
  },
  { key: "RENEW", label: "Renew", tone: "renew" },
  { key: "CLOSE_LEAD", label: "Close Lead", tone: "close" },
  { key: "ALREADY_RENEWED", label: "Already Renewed", tone: "renewed" },
  { key: "CAR_SOLD", label: "Car Sold", tone: "sold" },
  { key: "CAR_EXPIRED", label: "Car Expired", tone: "expired" },
  {
    key: "POLICY_FROM_ELSEWHERE",
    label: "Policy from Elsewhere",
    tone: "view",
  },
];

const parseDate = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const getExpiryDate = (row = {}) =>
  row.newOdExpiryDate ||
  row.previousOdExpiryDate ||
  row.newTpExpiryDate ||
  row.policyExpiry ||
  "";

const getDaysFromToday = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return date.startOf("day").diff(dayjs().startOf("day"), "day");
};

const getCaseId = (row) => row?._id || row?.id || row?.caseId || "";

const parseRenewalIncludedAddons = (row = {}) => {
  const candidates = [
    row?.previousIncludedAddons,
    row?.previousIncludedAddOns,
    row?.includedAddons,
    row?.includedAddOns,
    row?.previousAddOns,
    row?.previousAddonDetails,
    row?.previousAddOnsDetails,
    row?.previousAddOnsBreakup,
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
    if (Array.isArray(candidate)) return normalizeArray(candidate);
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

  return [];
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
        const days = getDaysFromToday(getExpiryDate(row));
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
        const value = Number(
          row?.previousOwnDamageAmount || row?.odAmount || 0,
        );
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

      const aDays = getDaysFromToday(getExpiryDate(a));
      const bDays = getDaysFromToday(getExpiryDate(b));
      const aNum = Number.isFinite(aDays) ? aDays : Number.POSITIVE_INFINITY;
      const bNum = Number.isFinite(bDays) ? bDays : Number.POSITIVE_INFINITY;
      if (aNum !== bNum) return aNum - bNum;
      const aDate = parseDate(getExpiryDate(a));
      const bDate = parseDate(getExpiryDate(b));
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
    <div
      className="min-h-screen px-4 py-4"
      style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%)" }}
    >
      <div className="mx-auto max-w-[1920px] space-y-4">
        <style>{`
          .renewal-action-chip {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.5rem 0.75rem;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.2;
            transition: all 0.15s ease;
            width: 100%;
            text-align: left;
          }
          .renewal-action-chip:hover { transform: translateY(-1px); filter: brightness(0.99); }
          .renewal-action-chip.active { box-shadow: inset 0 0 0 1px rgba(15,23,42,0.35); }
          .renewal-row-action-btn {
            border: 0;
            border-radius: 9999px;
            padding: 0.32rem 0.7rem;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            transition: all 0.15s ease;
            white-space: nowrap;
          }
          .renewal-row-action-btn:hover { transform: translateY(-1px); filter: brightness(0.98); }
          .chip-save { background: #f8fafc; color: #334155; }
          .chip-share { background: #eff6ff; color: #1d4ed8; }
          .chip-view { background: #f5f3ff; color: #6d28d9; }
          .chip-payment { background: #fffbeb; color: #b45309; }
          .chip-renew { background: #f0fdf4; color: #15803d; }
          .chip-close { background: #fff1f2; color: #b91c1c; }
          .chip-renewed { background: #ecfeff; color: #0e7490; }
          .chip-sold { background: #fff7ed; color: #c2410c; }
          .chip-expired { background: #fef2f2; color: #b91c1c; }
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
              const days = getDaysFromToday(getExpiryDate(row));
              const comment = draft.renewalComment ?? row.renewalComment ?? "";
              const totalPremium = Number(
                row?.newTotalPremium || row?.previousTotalPremium || 0,
              );
              const paymentRows = Array.isArray(row?.paymentHistory)
                ? row.paymentHistory
                : [];
              const customerPaid = paymentRows
                .filter(
                  (item) =>
                    String(item?.entryType || "").toUpperCase() ===
                      "CUSTOMER_RECEIPT" ||
                    String(item?.paymentType || "").toLowerCase() ===
                      "customer",
                )
                .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
              const subventionPaid = paymentRows
                .filter((item) =>
                  String(item?.entryType || "")
                    .toUpperCase()
                    .includes("SUBVENTION"),
                )
                .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
              const customerPaidPct =
                totalPremium > 0
                  ? Math.min(100, (customerPaid / totalPremium) * 100)
                  : 0;
              const subventionPct =
                totalPremium > 0
                  ? Math.min(100, (subventionPaid / totalPremium) * 100)
                  : 0;
              const paymentRowsForCard = [
                {
                  key: "customer",
                  label: "Customer paid insurer",
                  amount: Number(customerPaid || 0),
                  pct: customerPaidPct,
                  color: "#10b981",
                  soft: "#ecfdf5",
                  border: "#10b98133",
                },
                {
                  key: "subvention",
                  label: "Subvention",
                  amount: Number(subventionPaid || 0),
                  pct: subventionPct,
                  color: "#0ea5e9",
                  soft: "#dbeafe",
                  border: "#0ea5e933",
                },
              ];
              const hasPaymentActivity = paymentRowsForCard.some(
                (item) => Number(item.amount || 0) > 0,
              );
              const sourceLabel = String(
                row?.source || row?.sourceOrigin || "",
              ).trim();
              const referenceName =
                row?.referenceName ||
                row?.sourceName ||
                row?.dealerChannelName ||
                row?.reference_name ||
                "";
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
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {Number.isFinite(days) ? `${days} days` : "No expiry"}
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
                        <Tooltip title="Update Status">
                          <Popover
                            trigger="click"
                            placement="rightTop"
                            open={
                              String(statusActionRow?._id || "") === String(id)
                            }
                            onOpenChange={(open) =>
                              setStatusActionRow(open ? row : null)
                            }
                            content={
                              <div className="w-[250px] space-y-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                                  {row?.caseId
                                    ? `Case: ${row.caseId}`
                                    : "Select action"}
                                </div>
                                <div className="flex flex-col gap-2">
                                  {ACTION_CHIPS.map((item) => (
                                    <button
                                      key={`status-action-${id}-${item.key}`}
                                      type="button"
                                      className={`renewal-action-chip chip-${item.tone} text-left`}
                                      onClick={async () => {
                                        await runStatusAction(row, item.key);
                                        setStatusActionRow(null);
                                      }}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            }
                          >
                            <motion.button
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              className="h-8 w-8 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5"
                              style={{
                                background: "#fef3c7",
                                color: "#b45309",
                              }}
                            >
                              <Activity size={14} />
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
                                  {sourceLabel || "Direct"}
                                </span>
                              </div>
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
                                {row.previousInsuranceCompany || "—"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {row.previousPolicyNumber || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Type {row.previousPolicyType || "—"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              NCB {Number(row.previousNcbDiscount || 0)}%
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-500 truncate">
                              OD Expiry:{" "}
                              {row.previousOdExpiryDate
                                ? dayjs(row.previousOdExpiryDate).format(
                                    "DD MMM YYYY",
                                  )
                                : "—"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              TP Expiry:{" "}
                              {row.previousTpExpiryDate
                                ? dayjs(row.previousTpExpiryDate).format(
                                    "DD MMM YYYY",
                                  )
                                : "—"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              Premium:{" "}
                              {Number(
                                row.previousTotalPremium || 0,
                              ).toLocaleString("en-IN", {
                                style: "currency",
                                currency: "INR",
                                minimumFractionDigits: 0,
                              })}
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
                              <p className="text-[11px] text-slate-500 mt-1">
                                Previous Premium
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <DollarSign size={14} />
                            </div>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <p className="text-[22px] leading-6 font-black text-slate-900">
                              {Number(totalPremium || 0).toLocaleString(
                                "en-IN",
                                {
                                  style: "currency",
                                  currency: "INR",
                                  minimumFractionDigits: 2,
                                },
                              )}
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
                            paymentRowsForCard.map((item) => (
                              <motion.div
                                key={`${id}-${item.key}`}
                                whileHover={{ x: 2, y: -1 }}
                                transition={{ duration: 0.16 }}
                                className="relative"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="relative pt-0.5">
                                    <div
                                      className="w-8 h-8 rounded-xl flex items-center justify-center border"
                                      style={{
                                        background: item.soft,
                                        borderColor: item.border,
                                        color: item.color,
                                      }}
                                    >
                                      <DollarSign size={13} />
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
                                          style={{ color: item.color }}
                                        >
                                          {Number(item.amount || 0).toLocaleString(
                                            "en-IN",
                                            {
                                              style: "currency",
                                              currency: "INR",
                                              minimumFractionDigits: 0,
                                            },
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${item.pct}%` }}
                                          transition={{
                                            duration: 0.45,
                                            ease: "easeOut",
                                          }}
                                          className="h-full rounded-full"
                                          style={{
                                            background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}cc 100%)`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))
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
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black uppercase text-blue-700">
                          {status === "Closed" ? "Closed" : "Active"}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Created</span>
                          <span className="font-semibold text-slate-900">
                            {row.createdAt
                              ? dayjs(row.createdAt).format("DD MMM YYYY")
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Expiry</span>
                          <span className="font-semibold text-slate-900">
                            {getExpiryDate(row)
                              ? dayjs(getExpiryDate(row)).format("DD MMM YYYY")
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-[10px]">
                        <p className="font-bold uppercase tracking-wide text-blue-700">
                          Policy Pulse
                        </p>
                        <p className="font-semibold text-blue-700">
                          {days < 0
                            ? "Policy expired"
                            : days <= 30
                              ? "Renewal due soon"
                              : "Renewal case created"}
                        </p>
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
              {policyModal.row?.previousInsuranceCompany || "Insurance Company"}
            </p>
          </div>
        }
      >
        {policyModal.row ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            {(() => {
              const ownDamage = Number(
                policyModal.row?.previousOwnDamageAmount ||
                  policyModal.row?.previousOdAmount ||
                  0,
              );
              const ncbPercent = Number(policyModal.row?.previousNcbDiscount || 0);
              const ncbAmount = Number((ownDamage * ncbPercent) / 100);
              const includedAddons = parseRenewalIncludedAddons(policyModal.row);
              return (
            <PremiumBreakupCard
              breakup={{
                ownDamage,
                ownDamageBeforeNcb: Number(
                  policyModal.row?.previousOwnDamageBeforeNcb ||
                    ownDamage + ncbAmount,
                ),
                basicOwnDamage: ownDamage,
                ncbPercent,
                ncbAmount,
                thirdParty: Number(
                  policyModal.row?.previousThirdPartyAmount ||
                    policyModal.row?.previousTpAmount ||
                    0,
                ),
                basicThirdParty: Number(
                  policyModal.row?.previousBasicThirdPartyAmount ||
                    policyModal.row?.previousThirdPartyAmount ||
                    policyModal.row?.previousTpAmount ||
                    0,
                ),
                addOnsTotal: Number(policyModal.row?.previousAddOnsTotal || 0),
                totalAmount: Number(policyModal.row?.previousTotalPremium || 0),
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
              totalAmount={Number(policyModal.row?.previousTotalPremium || 0)}
              title="Premium Breakup"
            />
              );
            })()}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default InsuranceRenewalCasesPage;
