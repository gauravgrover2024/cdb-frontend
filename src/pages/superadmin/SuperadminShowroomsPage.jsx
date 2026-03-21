import React, { useState, useEffect } from "react";
import { message, Table, Modal } from "antd";
import { Eye, Trash2, Search, Store, MapPin, Percent, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showroomsApi } from "../../api/showrooms";

const SuperadminShowroomsPage = () => {
  const navigate = useNavigate();
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInputText, setSearchInputText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeStatFilter, setActiveStatFilter] = useState("all");

  const stats = {
    totalShowrooms: pagination.total || 0,
    activeOnPage: showrooms.filter((s) => String(s?.status || "Active") === "Active").length,
    uniqueCitiesOnPage: new Set(showrooms.map((s) => String(s?.city || "").trim()).filter(Boolean)).size,
    avgCommissionOnPage:
      showrooms.length > 0
        ? (showrooms.reduce((sum, s) => sum + (Number(s?.commissionRate) || 0), 0) / showrooms.length).toFixed(1)
        : "0.0",
  };

  const filteredShowrooms = showrooms.filter((s) => {
    if (activeStatFilter === "active") return String(s?.status || "Active") === "Active";
    if (activeStatFilter === "city") return Boolean(String(s?.city || "").trim());
    if (activeStatFilter === "commission") return Number(s?.commissionRate || 0) > 0;
    return true;
  });

  const parseShowroomListResponse = (res) => {
    const payload = res?.data && !Array.isArray(res.data) && res.data.data ? res.data : res;
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const total = Number(payload?.count ?? payload?.total ?? data.length ?? 0);
    return { data, total };
  };

  const loadShowrooms = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * 20;
      const res = await showroomsApi.getAll({ skip, limit: 20, q: search });
      const { data, total } = parseShowroomListResponse(res);
      setShowrooms(Array.isArray(data) ? data : []);
      setPagination({ current: page, pageSize: 20, total });
    } catch (error) {
      message.error("Failed to load showrooms");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputText(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => loadShowrooms(1, value), 300);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadShowrooms(1, "");
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, []);

  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Showroom",
      content: "Are you sure you want to delete this showroom?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await showroomsApi.delete(id);
          message.success("Deleted successfully");
          loadShowrooms(pagination.current, searchInputText);
        } catch (error) {
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const STAT_CARDS = [
    { key: "all", label: "Total Showrooms", value: stats.totalShowrooms, icon: Store,
      activeClass: "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
      iconClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
      valueClass: "text-foreground" },
    { key: "active", label: "Active", value: stats.activeOnPage, icon: CheckCircle2,
      activeClass: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
      iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400" },
    { key: "city", label: "Cities Covered", value: stats.uniqueCitiesOnPage, icon: MapPin,
      activeClass: "border-sky-400 bg-sky-50 dark:bg-sky-950/30",
      iconClass: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
      valueClass: "text-sky-600 dark:text-sky-400" },
    { key: "commission", label: "Avg Commission", value: `${stats.avgCommissionOnPage}%`, icon: Percent,
      activeClass: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
      iconClass: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
      valueClass: "text-violet-600 dark:text-violet-400" },
  ];

  const columns = [
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Showroom</span>,
      key: "showroom", width: "26%",
      render: (_, record) => (
        <div>
          <p className="font-semibold text-foreground">{record.name || "—"}</p>
          {record.city && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/70">
              <MapPin size={11} />{record.city}
            </div>
          )}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</span>,
      key: "contact", width: "22%",
      render: (_, record) => (
        <div>
          <p className="text-sm text-foreground/90">{record.contactPerson || "—"}</p>
          {record.mobile && <p className="mt-0.5 text-xs text-muted-foreground/70">{record.mobile}</p>}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST</span>,
      dataIndex: "gstNumber", key: "gstNumber", width: "18%",
      render: (text) => <span className="font-mono text-xs text-muted-foreground">{text || "—"}</span>,
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission</span>,
      dataIndex: "commissionRate", key: "commissionRate", width: "12%",
      render: (text) => (
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          {text || 0}%
        </span>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>,
      dataIndex: "status", key: "status", width: "12%",
      render: (text) => {
        const isActive = String(text || "Active") === "Active";
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700"
              : "bg-muted text-muted-foreground ring-1 ring-border"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
            {text || "Active"}
          </span>
        );
      },
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>,
      key: "actions", width: "10%",
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/superadmin/showrooms/${record._id}`)}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-700 dark:hover:bg-indigo-950/60"
          >
            <Eye size={12} />View
          </button>
          <button
            onClick={() => handleDelete(record._id)}
            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-700 dark:hover:bg-red-950/60"
          >
            <Trash2 size={12} />Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Store size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Showroom Management</h2>
            <p className="text-sm text-muted-foreground">View and manage all registered showrooms</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search by name or city…"
            value={searchInputText}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = activeStatFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveStatFilter(card.key)}
              className={`group rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
                isActive ? card.activeClass : "border-border bg-card hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <div className={`rounded-lg p-1.5 ${card.iconClass}`}>
                  <Icon size={14} />
                </div>
              </div>
              <p className={`mt-2 text-2xl font-black ${isActive ? card.valueClass : "text-foreground"}`}>
                {card.value}
              </p>
              {isActive && (
                <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground/70">
                  <SlidersHorizontal size={10} />Filter active
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredShowrooms}
          loading={loading}
          rowKey="_id"
          rowClassName="hover:bg-muted/30 transition-colors"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => loadShowrooms(page, searchInputText),
            className: "px-4 pb-2",
          }}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
};

export default SuperadminShowroomsPage;
