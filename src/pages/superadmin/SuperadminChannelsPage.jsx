import React, { useState, useEffect } from "react";
import { message, Table, Modal } from "antd";
import { Plus, Search, Radio, Pencil, Trash2, User, Mail } from "lucide-react";
import { channelsApi } from "../../api/channels";

const SuperadminChannelsPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInputText, setSearchInputText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactPerson: "",
    email: "",
  });
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadChannels = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * 20;
      const res = await channelsApi.getAll({ skip, limit: 20, q: search });
      const data = res?.data || [];
      const total = res?.count || 0;
      setChannels(Array.isArray(data) ? data : []);
      setPagination({ current: page, pageSize: 20, total });
    } catch (error) {
      message.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputText(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => loadChannels(1, value), 300);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadChannels(1, "");
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, []);

  const handleSave = async () => {
    if (!formData.name) {
      message.error("Channel name required");
      return;
    }
    setSaving(true);
    try {
      if (editingChannel) {
        await channelsApi.update(editingChannel._id, formData);
        message.success("Updated successfully");
      } else {
        await channelsApi.create(formData);
        message.success("Created successfully");
      }
      setIsModalVisible(false);
      setEditingChannel(null);
      setFormData({ name: "", description: "", contactPerson: "", email: "" });
      loadChannels(pagination.current, searchInputText);
    } catch (error) {
      message.error(error?.message || "Error saving channel");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Channel",
      content: "Are you sure you want to delete this channel?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await channelsApi.delete(id);
          message.success("Deleted successfully");
          loadChannels(pagination.current, searchInputText);
        } catch (error) {
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const columns = [
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel</span>,
      key: "channel",
      width: "32%",
      render: (_, record) => (
        <div>
          <p className="font-semibold text-foreground">{record.name || "—"}</p>
          {record.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">{record.description}</p>
          )}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</span>,
      key: "contact",
      width: "32%",
      render: (_, record) => (
        <div className="space-y-0.5">
          {record.contactPerson && (
            <div className="flex items-center gap-1.5 text-sm text-foreground/90">
              <User size={12} className="text-muted-foreground/60" />
              {record.contactPerson}
            </div>
          )}
          {record.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Mail size={11} className="text-muted-foreground/40" />
              <span className="truncate">{record.email}</span>
            </div>
          )}
          {!record.contactPerson && !record.email && <span className="text-sm text-muted-foreground/40">—</span>}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>,
      key: "actions",
      width: "12%",
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingChannel(record);
              setFormData(record);
              setIsModalVisible(true);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-700 dark:hover:bg-indigo-950/60"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={() => handleDelete(record._id)}
            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-700 dark:hover:bg-red-950/60"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Radio size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Channel Management</h2>
              {!loading && channels.length > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {pagination.total || channels.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Create and manage distribution channels</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search by name or contact…"
              value={searchInputText}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 sm:w-64"
            />
          </div>

          <button
            onClick={() => {
              setEditingChannel(null);
              setFormData({ name: "", description: "", contactPerson: "", email: "" });
              setIsModalVisible(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Plus size={15} />
            New Channel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          dataSource={channels}
          loading={loading}
          rowKey="_id"
          rowClassName="hover:bg-muted/30 transition-colors"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => loadChannels(page, searchInputText),
            className: "px-4 pb-2",
          }}
        />
      </div>

      {/* Modal for add/edit */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <Radio size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-base font-bold text-foreground">
              {editingChannel ? "Edit Channel" : "New Channel"}
            </span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsModalVisible(false)}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingChannel ? "Save Changes" : "Create Channel"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Direct Sales, Online Portal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              placeholder="Brief description of this channel…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Person
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <input
              type="email"
              placeholder="contact@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperadminChannelsPage;
