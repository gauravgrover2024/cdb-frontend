import React, { useState, useEffect } from "react";
import { message, Table, Modal } from "antd";
import { Plus, Eye, Trash2, Search, Landmark, CheckCircle2, FileText, Map, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { banksApi } from "../../api/banks";
import BankLogoBadge from "../../components/banks/BankLogoBadge";

const IFSC_BANK_CODE_MAP = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  FDRL: "Federal Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  IDIB: "Indian Bank",
  BARB: "Bank of Baroda",
  BKID: "Bank of India",
  UBIN: "Union Bank of India",
  INDB: "IndusInd Bank",
  YESB: "Yes Bank",
  IDFB: "IDFC First Bank",
  MAHB: "Bank of Maharashtra",
};

const inferBankNameFromIfsc = (ifsc) => {
  const normalized = String(ifsc || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalized)) return "";
  return IFSC_BANK_CODE_MAP[normalized.slice(0, 4)] || "";
};

const getDisplayBankName = (bank) =>
  bank?.name || inferBankNameFromIfsc(bank?.ifsc) || "Unknown Bank";

const SuperadminBanksPage = () => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [formData, setFormData] = useState({
    name: "",
    ifsc: "",
    branch: "",
    address: "",
    city: "",
    contact: "",
    state: "",
    district: "",
    micr: "",
  });
  const [activeStatFilter, setActiveStatFilter] = useState("all");

  const stats = {
    totalBanks: pagination.total || 0,
    activeOnPage: banks.filter((b) => b?.active !== false).length,
    withIfscOnPage: banks.filter((b) => String(b?.ifsc || "").trim()).length,
    uniqueStatesOnPage: new Set(
      banks.map((b) => String(b?.state || "").trim()).filter(Boolean),
    ).size,
  };

  const filteredBanks = banks.filter((b) => {
    if (activeStatFilter === "active") return b?.active !== false;
    if (activeStatFilter === "ifsc") return Boolean(String(b?.ifsc || "").trim());
    if (activeStatFilter === "state") return Boolean(String(b?.state || "").trim());
    return true;
  });

  const loadBanks = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * pagination.pageSize;
      const res = await banksApi.getPaginated(skip, pagination.pageSize, search);
      const data = res?.data || res;
      if (res?.pagination) {
        setPagination((prev) => ({ ...prev, current: page, total: res.pagination.total }));
      }
      setBanks(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load banks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanks(1, searchText); }, []);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setTimeout(() => loadBanks(1, e.target.value), 300);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.ifsc) {
      message.error("Bank name and IFSC required");
      return;
    }
    setSaving(true);
    try {
      if (editingBank) {
        await banksApi.update(editingBank._id, formData);
        message.success("Updated successfully");
      } else {
        await banksApi.create(formData);
        message.success("Created successfully");
      }
      setIsModalVisible(false);
      setEditingBank(null);
      setFormData({ name: "", ifsc: "", branch: "", address: "", city: "", contact: "", state: "", district: "", micr: "" });
      loadBanks(pagination.current, searchText);
    } catch (error) {
      message.error(error?.message || "Error saving bank");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Bank",
      content: "Are you sure you want to delete this bank?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await banksApi.delete(id);
          message.success("Deleted successfully");
          loadBanks(pagination.current, searchText);
        } catch (error) {
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const STAT_CARDS = [
    {
      key: "all",
      label: "Total Banks",
      value: stats.totalBanks,
      icon: Landmark,
      activeClass: "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
      iconClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
      valueClass: "text-foreground",
    },
    {
      key: "active",
      label: "Active",
      value: stats.activeOnPage,
      icon: CheckCircle2,
      activeClass: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
      iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "ifsc",
      label: "IFSC Available",
      value: stats.withIfscOnPage,
      icon: FileText,
      activeClass: "border-sky-400 bg-sky-50 dark:bg-sky-950/30",
      iconClass: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
      valueClass: "text-sky-600 dark:text-sky-400",
    },
    {
      key: "state",
      label: "States Covered",
      value: stats.uniqueStatesOnPage,
      icon: Map,
      activeClass: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
      iconClass: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
      valueClass: "text-violet-600 dark:text-violet-400",
    },
  ];

  const columns = [
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank</span>,
      key: "bank",
      width: "30%",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <BankLogoBadge bankName={getDisplayBankName(record)} size={32} />
          <div>
            <p className="font-semibold text-foreground">{getDisplayBankName(record)}</p>
            {record.branch && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">{record.branch}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IFSC</span>,
      dataIndex: "ifsc",
      key: "ifsc",
      width: "18%",
      render: (text) => (
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium text-foreground/80 ring-1 ring-border">
          {text || "—"}
        </span>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</span>,
      key: "location",
      width: "25%",
      render: (_, record) => (
        <div>
          {record.city && <p className="text-sm text-foreground/90">{record.city}</p>}
          {record.state && <p className="text-xs text-muted-foreground/70">{record.state}</p>}
          {!record.city && !record.state && <span className="text-sm text-muted-foreground/40">—</span>}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>,
      key: "status",
      width: "10%",
      render: (_, record) => {
        const isActive = record?.active !== false;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700"
                : "bg-muted text-muted-foreground ring-1 ring-border"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>,
      key: "actions",
      width: "17%",
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/superadmin/banks/${record._id}`, { state: { bank: record } })}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-700 dark:hover:bg-indigo-950/60"
          >
            <Eye size={12} />
            View
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
            <Landmark size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Bank Management</h2>
            <p className="text-sm text-muted-foreground">Manage the bank directory and branches</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search name, branch or IFSC…"
              value={searchText}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 sm:w-64"
            />
          </div>

          <button
            onClick={() => {
              setEditingBank(null);
              setFormData({ name: "", ifsc: "", branch: "", address: "", city: "", contact: "", state: "", district: "", micr: "" });
              setIsModalVisible(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Plus size={15} />
            New Bank
          </button>
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
          dataSource={filteredBanks}
          loading={loading}
          rowKey="_id"
          rowClassName="hover:bg-muted/30 transition-colors"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => loadBanks(page, searchText),
            showSizeChanger: false,
            className: "px-4 pb-2",
          }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* Modal for add/edit */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <Landmark size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-base font-bold text-foreground">
              {editingBank ? "Edit Bank" : "New Bank"}
            </span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={560}
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
              {saving ? "Saving…" : editingBank ? "Save Changes" : "Create Bank"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC0001234"
              value={formData.ifsc}
              onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              MICR Code
            </label>
            <input
              type="text"
              placeholder="9-digit MICR"
              value={formData.micr}
              onChange={(e) => setFormData({ ...formData, micr: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Branch Name
            </label>
            <input
              type="text"
              placeholder="e.g. Connaught Place"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Address
            </label>
            <input
              type="text"
              placeholder="Street address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              City
            </label>
            <input
              type="text"
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              District
            </label>
            <input
              type="text"
              placeholder="District"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              State
            </label>
            <input
              type="text"
              placeholder="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Number
            </label>
            <input
              type="text"
              placeholder="Phone number"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperadminBanksPage;
