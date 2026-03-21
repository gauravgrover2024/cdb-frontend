import React, { useState, useEffect } from "react";
import { Button, Input, message, Table, Space, Modal } from "antd";
import { Plus, Eye } from "lucide-react";
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

/**
 * Superadmin page: Manage all banks
 * Features: Create, Edit, Delete, View all banks
 */
const SuperadminBanksPage = () => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
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

  // Load banks with pagination
  const loadBanks = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * pagination.pageSize;
      const res = await banksApi.getPaginated(skip, pagination.pageSize, search);
      const data = res?.data || res;
      
      if (res?.pagination) {
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: res.pagination.total,
        }));
      }
      
      setBanks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading banks:", error);
      message.error("Failed to load banks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanks(1, searchText);
  }, []);

  // Filter banks by search (client-side filtering is disabled, use server-side search)
  // Actually, since we're using pagination, we need to reload data when search changes
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    // Reset to page 1 and search
    setTimeout(() => {
      loadBanks(1, e.target.value);
    }, 300);
  };

  // Handle add/edit
  const handleSave = async () => {
    if (!formData.name || !formData.ifsc) {
      message.error("Bank name and IFSC required");
      return;
    }

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
      console.error("Error saving bank:", error);
      message.error(error?.message || "Error saving bank");
    }
  };

  // Handle delete
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
          console.error("Error deleting bank:", error);
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const columns = [
    {
      title: "Bank",
      key: "bank",
      width: "30%",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <BankLogoBadge bankName={getDisplayBankName(record)} size={30} />
          <span className="font-medium text-foreground">{getDisplayBankName(record)}</span>
        </div>
      ),
    },
    {
      title: "IFSC",
      dataIndex: "ifsc",
      key: "ifsc",
      width: "18%",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: "35%",
    },
    {
      title: "Actions",
      key: "actions",
      width: "17%",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<Eye size={14} />}
            onClick={() =>
              navigate(`/superadmin/banks/${record._id}`, {
                state: { bank: record },
              })
            }
          >
            View
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-black text-foreground">Bank Management</h2>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            setEditingBank(null);
            setFormData({ name: "", ifsc: "", branch: "", address: "", city: "", contact: "", state: "", district: "", micr: "" });
            setIsModalVisible(true);
          }}
        >
          New Bank
        </Button>
      </div>

      <Input
        placeholder="Search by bank name, branch, or IFSC..."
        value={searchText}
        onChange={handleSearchChange}
        className="w-full"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveStatFilter("all")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "all" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Total Banks</p>
          <p className="text-2xl font-black text-foreground">{stats.totalBanks}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("active")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "active" ? "border-emerald-500 bg-emerald-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Active (This Page)</p>
          <p className="text-2xl font-black text-emerald-600">{stats.activeOnPage}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("ifsc")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "ifsc" ? "border-sky-500 bg-sky-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">IFSC Available</p>
          <p className="text-2xl font-black text-sky-600">{stats.withIfscOnPage}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("state")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "state" ? "border-violet-500 bg-violet-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">States Covered</p>
          <p className="text-2xl font-black text-violet-600">{stats.uniqueStatesOnPage}</p>
        </button>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Active Filter</p>
          <p className="text-sm font-bold text-foreground capitalize">{activeStatFilter}</p>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredBanks}
        loading={loading}
        rowKey="_id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => loadBanks(page, searchText),
          showSizeChanger: false,
        }}
      />

      {/* No modal needed - using detail page for view/edit */}
    </div>
  );
};

export default SuperadminBanksPage;
