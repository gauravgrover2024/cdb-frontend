import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input, Select, Table, Tag, Tooltip } from "antd";
import {
  Activity,
  Download,
  FileText,
  Globe,
  LogIn,
  LogOut,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  ActivityType,
  clearActivityLog,
  exportLogAsCSV,
  getActivityLog,
} from "../../utils/activityLogger";
import { useAuth } from "../../context/AuthContext";

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_META = {
  [ActivityType.PAGE_VISIT]: {
    label: "Page Visit",
    icon: <Globe size={13} />,
    color: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  [ActivityType.LOGIN]: {
    label: "Login",
    icon: <LogIn size={13} />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  [ActivityType.LOGOUT]: {
    label: "Logout",
    icon: <LogOut size={13} />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  [ActivityType.CREATE]: {
    label: "Create",
    icon: <Plus size={13} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  [ActivityType.UPDATE]: {
    label: "Update",
    icon: <PenLine size={13} />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  [ActivityType.DELETE]: {
    label: "Delete",
    icon: <Trash2 size={13} />,
    color: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  [ActivityType.EXPORT]: {
    label: "Export",
    icon: <Download size={13} />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  [ActivityType.SEARCH]: {
    label: "Search",
    icon: <Search size={13} />,
    color: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  [ActivityType.PRINT]: {
    label: "Print",
    icon: <Printer size={13} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  [ActivityType.ERROR]: {
    label: "Error",
    icon: <TriangleAlert size={13} />,
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

const fallbackMeta = {
  label: "Event",
  icon: <FileText size={13} />,
  color: "bg-slate-100 text-slate-600 border-slate-200",
  dot: "bg-slate-400",
};

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || fallbackMeta;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main component ───────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  "Insurance",
  "Customers",
  "Loans",
  "Payments",
  "Bookings",
  "Finance",
  "Delivery Orders",
  "Vehicles",
  "Fleet",
  "Used Cars",
  "Tools",
  "Analytics",
  "ACI Assist",
  "Profile",
  "Control Panel",
  "Dashboard",
  "App",
].map((m) => ({ label: m, value: m }));

const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, meta]) => ({
  label: meta.label,
  value,
}));

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterModule, setFilterModule] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setEntries(getActivityLog());
  }, []);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  // Auto-refresh every 5 seconds to pick up new events
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterModule) list = list.filter((e) => e.module === filterModule);
    if (filterType) list = list.filter((e) => e.type === filterType);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (e) =>
          (e.action || "").toLowerCase().includes(q) ||
          (e.detail || "").toLowerCase().includes(q) ||
          (e.module || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filterModule, filterType, searchText]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const handleClear = () => {
    clearActivityLog();
    setEntries([]);
  };

  const handleExport = () => {
    exportLogAsCSV(filtered);
  };

  const columns = [
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      render: (ts) => (
        <Tooltip title={formatTime(ts)}>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-slate-700">
              {timeAgo(ts)}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(ts).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 130,
      render: (type) => <TypeBadge type={type} />,
    },
    {
      title: "Module",
      dataIndex: "module",
      key: "module",
      width: 140,
      render: (mod) => (
        <span className="text-[12px] font-semibold text-slate-600">
          {mod || "—"}
        </span>
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (action, record) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-slate-800">
            {action}
          </span>
          {record.detail && record.detail !== record.action && (
            <span className="text-[11px] text-slate-400">{record.detail}</span>
          )}
        </div>
      ),
    },
  ];

  const topTypes = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      {/* ── Header card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Control Panel
              </p>
              <h1 className="m-0 text-[22px] font-black text-white">
                Activity Log
              </h1>
              <p className="mt-0.5 text-[13px] text-slate-400">
                Session events for{" "}
                <span className="font-semibold text-slate-200">
                  {user?.name || user?.email || "current user"}
                </span>
                {" · "}
                {entries.length} events recorded
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-white/20"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/20 px-3 py-2 text-[12px] font-semibold text-teal-300 transition hover:bg-teal-500/30 disabled:opacity-40"
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-[12px] font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-40"
            >
              <X size={13} />
              Clear Log
            </button>
          </div>
        </div>

        {/* ── Summary chips ── */}
        {topTypes.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Session summary:
            </span>
            {topTypes.map(([type, count]) => {
              const meta = TYPE_META[type] || fallbackMeta;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFilterType(filterType === type ? null : type)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                    filterType === type
                      ? "border-white/30 bg-white/20 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                  />
                  {meta.label}
                  <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder="Search actions, modules, details…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className="h-9 max-w-sm rounded-xl"
        />
        <Select
          placeholder="All Modules"
          value={filterModule}
          onChange={setFilterModule}
          allowClear
          options={MODULE_OPTIONS}
          style={{ width: 170 }}
          className="h-9"
        />
        <Select
          placeholder="All Types"
          value={filterType}
          onChange={setFilterType}
          allowClear
          options={TYPE_OPTIONS}
          style={{ width: 150 }}
          className="h-9"
        />
        {(filterModule || filterType || searchText) && (
          <button
            type="button"
            onClick={() => {
              setFilterModule(null);
              setFilterType(null);
              setSearchText("");
            }}
            className="flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] text-slate-400">
          {filtered.length} of {entries.length} events
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
            <Activity size={40} strokeWidth={1.2} />
            <p className="text-[14px] font-medium">No activity yet this session</p>
            <p className="text-[12px]">
              Actions like page visits, creates, and updates will appear here automatically.
            </p>
          </div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ["25", "50", "100", "200"],
              showTotal: (total) => `${total} events`,
              size: "small",
            }}
            scroll={{ x: 700 }}
            className="activity-log-table"
            rowClassName={(record) =>
              record.type === ActivityType.ERROR
                ? "!bg-red-50/40"
                : record.type === ActivityType.DELETE
                  ? "!bg-rose-50/30"
                  : ""
            }
          />
        )}
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-[11px] text-slate-400">
        Activity log is stored locally for this browser session and is
        automatically cleared when you close the browser tab.
      </p>
    </div>
  );
}
