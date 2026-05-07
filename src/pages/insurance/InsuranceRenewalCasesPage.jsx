import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DatePicker, Input, Modal, Select, message } from "antd";
import dayjs from "dayjs";
import { insuranceApi } from "../../api/insurance";
import { getEmployees } from "../../api/employees";
import { useAuth } from "../../context/AuthContext";

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

const isPendingRenewal = (row) => {
  const days = getDaysFromToday(getExpiryDate(row));
  return Number.isFinite(days) && days <= 30 && days >= -45;
};

const getCaseId = (row) => row?._id || row?.id || row?.caseId || "";

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
  const [activeTab, setActiveTab] = useState("non-assigned");
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [rowDrafts, setRowDrafts] = useState({});
  const [timelineRow, setTimelineRow] = useState(null);
  const [summary, setSummary] = useState({
    activeCases: 0,
    policiesPending: 0,
    paymentPending: 0,
    pendingRenewals: 0,
  });

  const role = String(user?.role || "").toLowerCase();
  const isAdminLike = [
    "superadmin",
    "admin",
    "team_lead",
    "insurance_team_lead",
  ].includes(role);
  const meId = String(user?._id || user?.id || "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, employeesRes, summaryRes] = await Promise.all([
        insuranceApi.getRenewalCases({
          futureDays: 30,
          pastDays: 45,
          ...(odAmountRange !== "all" ? { odAmountRange } : {}),
          ...(isAdminLike ? {} : { assignedOnly: 1, assignedToId: meId }),
        }),
        getEmployees(),
        insuranceApi.getRenewalSummary(),
      ]);
      const rows = Array.isArray(casesRes?.data)
        ? casesRes.data
        : Array.isArray(casesRes?.items)
          ? casesRes.items
          : [];
      setCases(rows.filter(isPendingRenewal));
      setEmployees(Array.isArray(employeesRes) ? employeesRes : []);
      setSummary(summaryRes?.data || {});
    } catch (err) {
      message.error(err?.message || "Failed to load renewal cases");
    } finally {
      setLoading(false);
    }
  }, [isAdminLike, meId, odAmountRange]);

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

    if (!isAdminLike) {
      rows = rows.filter(
        (row) => String(row?.renewalAssignedToId || "") === String(meId),
      );
    } else {
      if (activeTab === "non-assigned") {
        rows = rows.filter((row) => !row?.renewalAssignedToId);
      } else if (activeTab === "assigned") {
        rows = rows.filter((row) => row?.renewalAssignedToId);
      }
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
        const value = Number(row?.previousOwnDamageAmount || row?.odAmount || 0);
        if (!Number.isFinite(value) || value < 0) return false;
        if (odAmountRange === "lt10k") return value < 10000;
        if (odAmountRange === "10k-20k") return value >= 10000 && value <= 20000;
        if (odAmountRange === "gt20k") return value > 20000;
        return true;
      });
    }

    if (followFrom || followTo) {
      rows = rows.filter((row) => {
        const date = parseDate(row?.renewalFollowUpDate);
        if (!date) return false;
        if (followFrom && date.isBefore(followFrom.startOf("day"))) return false;
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
  const nonAssignedCount = cases.filter((row) => !row?.renewalAssignedToId).length;
  const assignedToMeCount = cases.filter(
    (row) => String(row?.renewalAssignedToId || "") === meId,
  ).length;

  const selectedAll = filteredCases.length > 0 && selectedIds.length === filteredCases.length;

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredCases.map((row) => getCaseId(row)));
  };

  const toggleSelect = (caseId) => {
    setSelectedIds((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId],
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
      patch.renewalClosedReason = draft.renewalClosedReason || row.renewalClosedReason || "";
      if (!patch.renewalClosedReason) {
        message.error("Closed reason is required before saving.");
        return;
      }
    }
    try {
      await insuranceApi.updateRenewalLead(id, patch);
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">
          Insurance Renewal Case Listing and Assignment
        </h2>
        <p className="text-sm text-slate-500">
          Pending renewals (expiry next 30 days or expired last 45 days)
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            Pending: {pendingCount}
          </span>
          <span className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-700">
            Non-assigned: {nonAssignedCount}
          </span>
          {!isAdminLike && (
            <span className="rounded-lg bg-blue-100 px-3 py-1 font-semibold text-blue-700">
              Assigned to me: {assignedToMeCount}
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">Active Cases</div>
            <div className="text-base font-bold text-slate-900">
              {Number(summary?.activeCases || 0)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">Policies Pending</div>
            <div className="text-base font-bold text-slate-900">
              {Number(summary?.policiesPending || 0)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">Payment Pending</div>
            <div className="text-base font-bold text-slate-900">
              {Number(summary?.paymentPending || 0)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">Pending Renewals</div>
            <div className="text-base font-bold text-slate-900">
              {Number(summary?.pendingRenewals || 0)}
            </div>
          </div>
        </div>
      </div>

      {isAdminLike && (
        <div className="flex flex-wrap gap-2">
          {["non-assigned", "assigned", "all"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                activeTab === tab
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700"
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
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-7">
          <Input
            placeholder="Search Reg no / Name / Mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={policyStatusFilter}
            onChange={setPolicyStatusFilter}
            options={[
              { label: "Policy Status: All", value: "all" },
              { label: "Not expired", value: "not-expired" },
              { label: "Already expired", value: "expired" },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "Lead Status: All", value: "all" },
              ...LEAD_STATUS_OPTIONS.map((x) => ({ label: x, value: x })),
            ]}
          />
          <Select
            value={assignedFilter}
            onChange={setAssignedFilter}
            options={[
              { label: "Assigned: All", value: "all" },
              { label: "Not Assigned", value: "none" },
              ...employees.map((emp) => ({
                label: emp?.name || emp?.email || "User",
                value: String(emp?._id || emp?.id || ""),
              })),
            ]}
          />
          <Select
            value={odAmountRange}
            onChange={setOdAmountRange}
            options={[
              { label: "OD Amount: All", value: "all" },
              { label: "OD < 10K", value: "lt10k" },
              { label: "OD 10K - 20K", value: "10k-20k" },
              { label: "OD > 20K", value: "gt20k" },
            ]}
          />
          <DatePicker
            placeholder="Follow-up from"
            value={followFrom}
            onChange={setFollowFrom}
          />
          <DatePicker
            placeholder="Follow-up to"
            value={followTo}
            onChange={setFollowTo}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                {isAdminLike && <th className="px-3 py-2">Select</th>}
                <th className="px-3 py-2">Customer Details</th>
                <th className="px-3 py-2">Car Details</th>
                <th className="px-3 py-2">Previous Policy</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Follow Up</th>
                <th className="px-3 py-2">Comment</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((row) => {
                const id = getCaseId(row);
                const draft = rowDrafts[id] || {};
                const status = draft.renewalLeadStatus ?? row.renewalLeadStatus ?? "New";
                const followUp = draft.renewalFollowUpDate ?? row.renewalFollowUpDate ?? "";
                const comment = draft.renewalComment ?? row.renewalComment ?? "";
                const assignedTo = row.renewalAssignedToName || "Not Assigned";
                return (
                  <tr key={id} className="border-b align-top">
                    {isAdminLike && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelect(id)}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">
                        {row.customerName || row.companyName || "—"}
                      </div>
                      <div className="text-slate-600">{row.mobile || "—"}</div>
                      <div className="text-slate-500">{row.email || "—"}</div>
                      <div className="text-xs text-slate-400">
                        Created:{" "}
                        {row.createdAt ? dayjs(row.createdAt).format("DD MMM YYYY") : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">
                        {[row.vehicleMake, row.vehicleModel, row.vehicleVariant]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </div>
                      <div>{row.registrationNumber || "—"}</div>
                      <div className="text-slate-500">{row.manufactureYear || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.previousPolicyNumber || "—"}</div>
                      <div>{row.previousInsuranceCompany || "—"}</div>
                      <div className="text-slate-600">
                        Expiry:{" "}
                        {getExpiryDate(row)
                          ? dayjs(getExpiryDate(row)).format("DD MMM YYYY")
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        size="small"
                        value={status}
                        style={{ width: 130 }}
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
                      {status === "Closed" && (
                        <Select
                          className="mt-2"
                          size="small"
                          placeholder="Closed reason"
                          value={draft.renewalClosedReason ?? row.renewalClosedReason}
                          options={CLOSE_REASONS.map((x) => ({ label: x, value: x }))}
                          onChange={(value) =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], renewalClosedReason: value },
                            }))
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <DatePicker
                        size="small"
                        showTime
                        value={followUp ? dayjs(followUp) : null}
                        onChange={(date) =>
                          setRowDrafts((prev) => ({
                            ...prev,
                            [id]: {
                              ...prev[id],
                              renewalFollowUpDate: date ? date.toISOString() : "",
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input.TextArea
                        value={comment}
                        rows={2}
                        onChange={(e) =>
                          setRowDrafts((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], renewalComment: e.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="mt-1 text-xs text-blue-600"
                        onClick={() => setTimelineRow(row)}
                      >
                        View Timeline
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      {row.renewalAssignedToId ? (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          Assigned to {assignedTo}
                        </span>
                      ) : (
                        <span className="text-slate-500">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Button size="small" onClick={() => saveRowUpdate(row)}>
                          Save
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
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
                          }}
                        >
                          Share Quotes
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/insurance/edit/${id}?section=quotes`)}
                        >
                          View Quotes
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
                            try {
                              await insuranceApi.updateRenewalLead(id, {
                                renewalLeadStatus: "Payment Pending",
                                action: "MARK_PAYMENT_PENDING",
                                updatedBy: user?.name || "User",
                              });
                              message.success("Lead marked as Payment Pending");
                              await load();
                            } catch (err) {
                              message.error(err?.message || "Failed to update lead");
                            }
                          }}
                        >
                          Mark Payment Pending
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => navigate(`/insurance/new?renewFrom=${id}`)}
                        >
                          Renew
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() =>
                            setRowDrafts((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                renewalLeadStatus: "Closed",
                              },
                            }))
                          }
                        >
                          Close Lead
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredCases.length && (
                <tr>
                  <td
                    colSpan={isAdminLike ? 9 : 8}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No renewal cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                  {item?.at ? dayjs(item.at).format("DD MMM YYYY, hh:mm A") : "—"} ·{" "}
                  {item?.by || "User"}
                </div>
                {item?.event ? (
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {String(item.event).replaceAll("_", " ")}
                  </div>
                ) : null}
                <div className="text-sm font-semibold">{item?.status || "—"}</div>
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
            <div className="text-sm text-slate-500">No timeline updates yet.</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InsuranceRenewalCasesPage;

