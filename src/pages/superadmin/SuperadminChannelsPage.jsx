import React, { useCallback, useEffect, useMemo, useState } from "react";
import { message, Modal, Table } from "antd";
import {
  Building2,
  CheckCircle2,
  Hash,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { channelsApi } from "../../api/channels";

const CHANNEL_TYPES = ["Dealer", "DSA", "Broker", "Direct Agent"];
const CHANNEL_STATUSES = ["Active", "Inactive", "Suspended", "Blacklisted"];

const EMPTY_FORM = {
  name: "",
  businessName: "",
  type: "Dealer",
  contactPerson: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  dsaCode: "",
  dealerCode: "",
  commissionRate: "",
  status: "Active",
  notes: "",
};

const typeTone = (type) => {
  const key = String(type || "").toLowerCase();
  if (key.includes("broker")) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800";
  }
  if (key.includes("dsa")) {
    return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800";
  }
  if (key.includes("dealer")) {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700";
};

const parseChannelListResponse = (res) => {
  const payload = res?.data && !Array.isArray(res.data) && res.data.data ? res.data : res;
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const total = Number(payload?.count ?? payload?.total ?? data.length ?? 0);
  return { data, total };
};

const SuperadminChannelsPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInputText, setSearchInputText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeStatFilter, setActiveStatFilter] = useState("all");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadChannels = useCallback(async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * pagination.pageSize;
      const params = { skip, limit: pagination.pageSize };
      if (search.trim()) params.q = search.trim();
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await channelsApi.getAll(params);
      const { data, total } = parseChannelListResponse(res);
      setChannels(Array.isArray(data) ? data : []);
      setPagination((prev) => ({ ...prev, current: page, total }));
    } catch {
      message.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, statusFilter, typeFilter]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputText(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => loadChannels(1, value), 300);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadChannels(1, searchInputText);
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const rows = channels;
    const active = rows.filter((c) => String(c?.status || "Active") === "Active").length;
    const brokers = rows.filter((c) => String(c?.type || "").toLowerCase().includes("broker")).length;
    const dealers = rows.filter((c) => String(c?.type || "").toLowerCase().includes("dealer")).length;
    const avgCommission =
      rows.length > 0
        ? (
            rows.reduce((sum, c) => sum + (Number(c?.commissionRate) || 0), 0) /
            rows.length
          ).toFixed(1)
        : "0.0";
    return {
      total: pagination.total || rows.length,
      active,
      brokers,
      dealers,
      avgCommission,
    };
  }, [channels, pagination.total]);

  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      if (activeStatFilter === "active") return String(c?.status || "Active") === "Active";
      if (activeStatFilter === "broker") {
        return String(c?.type || "").toLowerCase().includes("broker");
      }
      if (activeStatFilter === "dealer") {
        return String(c?.type || "").toLowerCase().includes("dealer");
      }
      if (activeStatFilter === "commission") return Number(c?.commissionRate || 0) > 0;
      return true;
    });
  }, [activeStatFilter, channels]);

  const openCreate = () => {
    setEditingChannel(null);
    setFormData(EMPTY_FORM);
    setIsModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingChannel(record);
    setFormData({
      ...EMPTY_FORM,
      ...record,
      commissionRate:
        record?.commissionRate != null ? String(record.commissionRate) : "",
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      commissionRate: Number(formData.commissionRate || 0),
    };
    const required = [
      ["name", "Channel name"],
      ["type", "Type"],
      ["contactPerson", "Contact person"],
      ["mobile", "Mobile"],
      ["address", "Address"],
      ["city", "City"],
    ];
    for (const [key, label] of required) {
      if (!String(payload[key] || "").trim()) {
        message.error(`${label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingChannel?._id) {
        await channelsApi.update(editingChannel._id, payload);
        message.success("Channel updated");
      } else {
        await channelsApi.create(payload);
        message.success("Channel created");
      }
      setIsModalVisible(false);
      setEditingChannel(null);
      setFormData(EMPTY_FORM);
      loadChannels(pagination.current, searchInputText);
    } catch (error) {
      message.error(error?.message || "Failed to save channel");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: "Deactivate channel",
      content: "This will mark the channel as inactive. Continue?",
      okText: "Deactivate",
      okType: "danger",
      onOk: async () => {
        try {
          await channelsApi.delete(id);
          message.success("Channel deactivated");
          loadChannels(pagination.current, searchInputText);
        } catch (error) {
          message.error(error?.message || "Failed to deactivate");
        }
      },
    });
  };

  const STAT_CARDS = [
    {
      key: "all",
      label: "Total Channels",
      value: stats.total,
      icon: Radio,
      activeClass: "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
      iconClass:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
      valueClass: "text-foreground",
    },
    {
      key: "active",
      label: "Active",
      value: stats.active,
      icon: CheckCircle2,
      activeClass: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
      iconClass:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "broker",
      label: "Brokers (page)",
      value: stats.brokers,
      icon: User,
      activeClass: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
      iconClass:
        "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
      valueClass: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "commission",
      label: "Avg Commission",
      value: `${stats.avgCommission}%`,
      icon: Percent,
      activeClass: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
      iconClass:
        "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
      valueClass: "text-violet-600 dark:text-violet-400",
    },
  ];

  const columns = [
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Channel ID
        </span>
      ),
      dataIndex: "channelId",
      key: "channelId",
      width: 130,
      render: (text) => (
        <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {text || "—"}
        </span>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Partner
        </span>
      ),
      key: "partner",
      width: "22%",
      render: (_, record) => (
        <div>
          <p className="font-semibold text-foreground">{record.name || "—"}</p>
          {record.businessName ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
              {record.businessName}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Type
        </span>
      ),
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (text) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${typeTone(text)}`}
        >
          {text || "—"}
        </span>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contact
        </span>
      ),
      key: "contact",
      width: "18%",
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1.5 text-sm text-foreground/90">
            <User size={12} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate">{record.contactPerson || "—"}</span>
          </div>
          {record.mobile ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Phone size={11} />
              {record.mobile}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Location
        </span>
      ),
      key: "location",
      width: "14%",
      render: (_, record) => (
        <div className="text-xs text-muted-foreground">
          {record.city ? (
            <div className="flex items-center gap-1">
              <MapPin size={11} />
              <span className="truncate">{record.city}</span>
            </div>
          ) : (
            "—"
          )}
        </div>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Codes
        </span>
      ),
      key: "codes",
      width: 110,
      render: (_, record) => (
        <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
          {record.dsaCode ? <div>DSA {record.dsaCode}</div> : null}
          {record.dealerCode ? <div>DLR {record.dealerCode}</div> : null}
          {!record.dsaCode && !record.dealerCode ? "—" : null}
        </div>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Commission
        </span>
      ),
      dataIndex: "commissionRate",
      key: "commissionRate",
      width: 100,
      render: (text) => (
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          {text ?? 0}%
        </span>
      ),
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </span>
      ),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (text) => {
        const isActive = String(text || "Active") === "Active";
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700"
                : "bg-muted text-muted-foreground ring-1 ring-border"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
            />
            {text || "Active"}
          </span>
        );
      },
    },
    {
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Actions
        </span>
      ),
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEdit(record)}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-700"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(record._id)}
            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-700"
          >
            <Trash2 size={12} />
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Channel Partners</h2>
            <p className="text-sm text-muted-foreground">
              Brokers, dealers, DSA & agents — same master used in insurance
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            />
            <input
              type="text"
              placeholder="Search ID, name, mobile, DSA…"
              value={searchInputText}
              onChange={handleSearchChange}
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`${inputClass} sm:w-36`}
          >
            <option value="all">All types</option>
            {CHANNEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} sm:w-32`}
          >
            <option value="all">All status</option>
            {CHANNEL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={15} />
            New Channel
          </button>
        </div>
      </div>

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
                isActive
                  ? card.activeClass
                  : "border-border bg-card hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <div className={`rounded-lg p-1.5 ${card.iconClass}`}>
                  <Icon size={14} />
                </div>
              </div>
              <p
                className={`mt-2 text-2xl font-black ${isActive ? card.valueClass : "text-foreground"}`}
              >
                {card.value}
              </p>
              {isActive ? (
                <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground/70">
                  <SlidersHorizontal size={10} />
                  Filter active
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredChannels}
          loading={loading}
          rowKey="_id"
          rowClassName="hover:bg-muted/30 transition-colors"
          scroll={{ x: 1100 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false,
            onChange: (page) => loadChannels(page, searchInputText),
            className: "px-4 pb-2",
          }}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2 pb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <Hash size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-base font-bold text-foreground">
              {editingChannel ? `Edit — ${editingChannel.channelId || "Channel"}` : "New Channel"}
            </span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={720}
        footer={
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalVisible(false)}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingChannel ? "Save Changes" : "Create Channel"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="Partner / business name"
            />
          </div>
          <div>
            <label className={labelClass}>Business Name</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) =>
                setFormData({ ...formData, businessName: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={inputClass}
            >
              {CHANNEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Contact Person <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) =>
                setFormData({ ...formData, contactPerson: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={inputClass}
            >
              {CHANNEL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Pincode</label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>DSA Code</label>
            <input
              type="text"
              value={formData.dsaCode}
              onChange={(e) => setFormData({ ...formData, dsaCode: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dealer Code</label>
            <input
              type="text"
              value={formData.dealerCode}
              onChange={(e) =>
                setFormData({ ...formData, dealerCode: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Commission %</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={formData.commissionRate}
              onChange={(e) =>
                setFormData({ ...formData, commissionRate: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperadminChannelsPage;
