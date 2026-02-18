import React, { useMemo, useState, useEffect } from "react";
import {
  Space,
  Tag,
  message,
  Modal,
  Popconfirm,
  Input,
  Button as AntButton,
} from "antd";
import { useNavigate } from "react-router-dom";
import CustomerViewModal from "./CustomerViewModal";
import { customersApi } from "../../api/customers";
import Icon from "../../components/AppIcon";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";

const StatCard = ({ title, value, color, iconName, onClick, isActive }) => {
  const theme = {
    blue: {
      card: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10",
      active: "bg-blue-600 border-blue-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-blue-500 dark:ring-blue-400",
      text: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
    emerald: {
      card: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10",
      active: "bg-emerald-600 border-emerald-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-emerald-500 dark:ring-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    amber: {
      card: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10",
      active: "bg-amber-500 border-amber-500 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-amber-500 dark:ring-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
    },
    purple: {
      card: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10",
      active: "bg-purple-600 border-purple-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-purple-500 dark:ring-purple-400",
      text: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
    },
  };
  const t = theme[color] || theme.blue;
  const textClass = isActive ? "text-white" : t.text;
  const iconClass = isActive ? "bg-white/20 text-white" : `${t.iconBg} ${t.text}`;

  return (
    <div
      className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] flex items-center justify-between gap-3 overflow-hidden min-h-0
        ${isActive ? t.active : `bg-card dark:bg-card/80 border-border ${t.card}`}
      `}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute top-1 right-1">
          <Icon name="CheckCircle2" size={12} className="text-white opacity-50" />
        </div>
      )}
      <div className="relative z-10 min-w-0">
        <p className={`text-xs font-medium mb-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>{title}</p>
        <p className={`text-xl font-bold font-mono tracking-tight ${textClass}`}>{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon name={iconName} size={20} className={textClass} />
      </div>
    </div>
  );
};

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeStatFilter, setActiveStatFilter] = useState("all");

  // Reassign flow: when delete is blocked by linked loans
  const [linkedLoansBlockedRecord, setLinkedLoansBlockedRecord] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignFrom, setReassignFrom] = useState(null);
  const [reassignSearch, setReassignSearch] = useState("");
  const [reassignSearchResults, setReassignSearchResults] = useState([]);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const data = await customersApi.getAll();

      setCustomers(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("Load Customers Error:", err);
      message.error("Failed to load customers ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Search for target customer when reassign modal is open
  useEffect(() => {
    if (!reassignModalOpen || !reassignFrom) return;
    const q = (reassignSearch || "").trim();
    if (q.length < 2) {
      setReassignSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await customersApi.search(q);
        const list = Array.isArray(res?.data) ? res.data : [];
        setReassignSearchResults(list.filter((c) => String(c._id) !== String(reassignFrom.id)));
      } catch {
        setReassignSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [reassignModalOpen, reassignFrom, reassignSearch]);

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = (record) => {
    const id = record?._id || record?.id;
    if (!id) return;
    navigate(`/customers/edit/${id}`);
  };

  const openViewModal = async (record) => {
    if (!record) return;

    setSelectedCustomer(record);
    setIsViewModalOpen(true);

    const id = record?._id || record?.id;
    if (!id) return;

    try {
      const data = await customersApi.getById(id);
      const fresh = data?.data || data;
      if (fresh && (fresh._id || fresh.id)) {
        setSelectedCustomer(fresh);
      }
    } catch (err) {
      console.error("Fetch Customer Error:", err);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = async (record) => {
    const id = record?._id || record?.id;
    if (!id) return;

    try {
      setDeletingId(id);

      await customersApi.delete(id);

      message.success("Customer deleted ✅");
      await loadCustomers();
    } catch (err) {
      console.error("Delete Customer Error:", err);
      // Extract backend message (support both Error.message and JSON response)
      let errMsg = err?.message || String(err);
      try {
        const parsed = typeof errMsg === "string" && errMsg.trim().startsWith("{") ? JSON.parse(errMsg) : null;
        if (parsed?.message) errMsg = parsed.message;
      } catch (_) {}

      const isLinkedLoans = /loan\(s\) are linked|reassign the loans|linked to this customer/i.test(errMsg);

      if (isLinkedLoans) {
        setLinkedLoansBlockedRecord({ id, customerName: record?.customerName || "this customer" });
      } else {
        message.error(`Delete failed ❌ ${errMsg}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openReassignModal = () => {
    if (linkedLoansBlockedRecord) {
      setReassignFrom(linkedLoansBlockedRecord);
      setReassignModalOpen(true);
      setReassignSearch("");
      setReassignSearchResults([]);
      setReassignTarget(null);
      setLinkedLoansBlockedRecord(null);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!reassignFrom?.id || !reassignTarget?._id) {
      message.warning("Please select a customer to reassign the loans to.");
      return;
    }
    try {
      setReassigning(true);
      await customersApi.reassignLoans(reassignFrom.id, reassignTarget._id);
      await customersApi.delete(reassignFrom.id);
      message.success(`Loans reassigned to ${reassignTarget.customerName || "customer"} and "${reassignFrom.customerName}" deleted.`);
      setReassignModalOpen(false);
      setReassignFrom(null);
      setReassignTarget(null);
      await loadCustomers();
    } catch (err) {
      const msg = err?.message || String(err);
      message.error(`Failed: ${msg}`);
    } finally {
      setReassigning(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...customers];

    // Search Filter
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = String(c.customerName || "").toLowerCase();
        const mobile = String(c.primaryMobile || "");
        const city = String(c.city || "").toLowerCase();
        const pan = String(c.panNumber || "").toLowerCase();
        return (
          name.includes(q) ||
          mobile.includes(q) ||
          city.includes(q) ||
          pan.includes(q)
        );
      });
    }

    // Stat/Status Filter
    if (activeStatFilter === "completed") {
      list = list.filter(c => c.kycStatus === "Completed");
    } else if (activeStatFilter === "pending") {
      list = list.filter(c => c.kycStatus === "Pending Docs");
    } else if (activeStatFilter === "repeat") {
      list = list.filter(c => c.customerType === "Repeat");
    }

    return list;
  }, [searchText, customers, activeStatFilter]);

  const total = customers.length;
  const completedKyc = customers.filter(
    (c) => c.kycStatus === "Completed",
  ).length;
  const pendingDocs = customers.filter(
    (c) => c.kycStatus === "Pending Docs",
  ).length;
  const repeat = customers.filter(
    (c) => String(c.customerType || "").toLowerCase() === "repeat",
  ).length;

  const columns = [
    {
      title: "Customer ID",
      dataIndex: "customerId",
      key: "customerId",
      width: 120,
      sorter: true,
      render: (v) => <span className="font-semibold text-muted-foreground">{v || "—"}</span>,
    },
    {
      title: "Customer Info",
      key: "customer",
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              {record.customerName || "—"}
            </span>
            {record.customerType === "Repeat" && (
              <Tag className="m-0 rounded-full px-1.5 py-0 border-none bg-primary/10 text-primary text-[10px] font-black uppercase">
                R
              </Tag>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="font-mono bg-muted/50 px-1 rounded border border-border/50">{record.primaryMobile || "N/A"}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="truncate max-w-[100px]">{record.city || "—"}</span>
          </div>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.customerName || "").localeCompare(
          String(b.customerName || ""),
        ),
    },
    {
      title: "Employment",
      key: "employment",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 500 }}>
            {record.occupationType || "—"}
          </span>
          <span style={{ color: "#8c8c8c" }}>{record.companyName || "—"}</span>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.occupationType || "").localeCompare(
          String(b.occupationType || ""),
        ),
    },
    {
      title: "Bank",
      key: "bank",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 500 }}>{record.bankName || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>{record.accountType || "—"}</span>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.bankName || "").localeCompare(String(b.bankName || "")),
    },
    {
      title: "KYC Status",
      dataIndex: "kycStatus",
      key: "kycStatus",
      width: 150,
      sorter: (a, b) => String(a.kycStatus || "").localeCompare(String(b.kycStatus || "")),
      render: (status) => {
        if (!status) return "—";
        const variants = {
          "Completed": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
          "Pending Docs": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          "Rejected": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
        const cls = variants[status] || "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
            {status}
          </span>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdOn",
      key: "createdOn",
      width: 120,
      render: (v) => (
        <span className="text-xs text-muted-foreground">{v || "—"}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right",
      className: "bg-white dark:bg-card", // Ensure background isn't transparent when fixed
      render: (_, record) => (
        <div 
          onClick={(e) => e.stopPropagation()} 
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex justify-end pr-2"
        >
          <Space size={4}>
            <Button
              size="sm"
              variant="ghost"
              iconName="Eye"
              onClick={() => openViewModal(record)}
            />

            <Button
              size="sm"
              variant="ghost"
              iconName="Edit3"
              onClick={() => handleEditCustomer(record)}
            />

            <Popconfirm
              title="Delete this customer?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => handleDeleteCustomer(record)}
            >
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
                iconName="Trash2"
                loading={deletingId === (record?._id || record?.id)}
              />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-background dark:bg-background overflow-hidden font-sans">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
         <StatCard 
            title="All Customers" 
            value={total} 
            color="blue" 
            iconName="Users" 
            isActive={activeStatFilter === 'all'}
            onClick={() => setActiveStatFilter('all')}
         />
         <StatCard 
            title="KYC Completed" 
            value={completedKyc} 
            color="emerald" 
            iconName="CheckCircle2" 
            isActive={activeStatFilter === 'completed'}
            onClick={() => setActiveStatFilter('completed')}
         />
         <StatCard 
            title="Pending Docs" 
            value={pendingDocs} 
            color="amber" 
            iconName="FileText" 
            isActive={activeStatFilter === 'pending'}
            onClick={() => setActiveStatFilter('pending')}
         />
         <StatCard 
            title="Repeat" 
            value={repeat} 
            color="purple" 
            iconName="Repeat" 
            isActive={activeStatFilter === 'repeat'}
            onClick={() => setActiveStatFilter('repeat')}
         />
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
           <Button
             variant="outline"
             size="sm"
             iconName="RefreshCcw"
             onClick={loadCustomers}
             loading={loading}
           >
             Refresh
           </Button>
           <div className="relative w-full max-w-sm min-w-[200px] flex-1">
             <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input
               type="text"
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
               placeholder="Search by name, mobile, city or PAN..."
               className="w-full h-9 pl-9 pr-3 py-1 text-sm border border-border rounded-lg bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
             />
           </div>
           <div className="text-xs font-semibold text-muted-foreground">
             Showing {filtered.length} records
           </div>
        </div>
        
        {/* Table Content */}
        <div className="flex-1 overflow-hidden relative">
          <DataTable
            columns={columns}
            dataSource={filtered.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)}
            rowKey="_id"
            loading={loading}
            onRowClick={(record) => openViewModal(record)}
            selection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            emptyText="No customers found"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: filtered.length,
              onChange: (page, size) => setPagination({ current: page, pageSize: size }),
              showTotal: (total, range) => <span className="text-xs text-muted-foreground">{range[0]}-{range[1]} of {total}</span>,
              size: "small" // Use small pagination from AntD inside DataTable
            }}
            rowClassName={() => "align-top hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-sm"}
          />
        </div>
      </div>

      {/* Cannot delete: linked loans */}
      <Modal
        open={!!linkedLoansBlockedRecord}
        title="Cannot delete customer"
        width={480}
        onCancel={() => setLinkedLoansBlockedRecord(null)}
        footer={[
          <AntButton key="go" onClick={() => { setLinkedLoansBlockedRecord(null); navigate("/loans"); }}>
            Go to Loans
          </AntButton>,
          <AntButton key="reassign" type="primary" onClick={openReassignModal}>
            Reassign loans & delete customer
          </AntButton>,
        ]}
      >
        {linkedLoansBlockedRecord && (
          <>
            <p className="text-neutral-700 dark:text-neutral-300 mb-2">
              1 loan (or more) is linked to this customer. Delete those loans or reassign them to another customer first.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Use <strong>Reassign loans & delete customer</strong> to move the loans to another customer, then remove this one.
            </p>
          </>
        )}
      </Modal>

      {/* Reassign loans to another customer, then delete */}
      <Modal
        open={reassignModalOpen}
        title="Reassign loans & delete customer"
        width={520}
        onCancel={() => { setReassignModalOpen(false); setReassignFrom(null); setReassignTarget(null); }}
        footer={[
          <AntButton key="cancel" onClick={() => { setReassignModalOpen(false); setReassignFrom(null); setReassignTarget(null); }}>
            Cancel
          </AntButton>,
          <AntButton
            key="submit"
            type="primary"
            loading={reassigning}
            disabled={!reassignTarget}
            onClick={handleReassignAndDelete}
          >
            Reassign & delete
          </AntButton>,
        ]}
      >
        {reassignFrom && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Move all loans from <strong>{reassignFrom.customerName}</strong> to another customer, then delete this customer.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Search customer to reassign to</label>
              <Input
                placeholder="Type name, mobile, or city..."
                value={reassignSearch}
                onChange={(e) => setReassignSearch(e.target.value)}
                allowClear
                className="rounded-lg"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {reassignSearchResults.length === 0 && (
                <div className="p-4 text-center text-neutral-500 text-sm">
                  {reassignSearch.trim().length < 2 ? "Type at least 2 characters to search" : "No other customers found"}
                </div>
              )}
              {reassignSearchResults.map((c) => (
                <div
                  key={c._id}
                  onClick={() => setReassignTarget(c)}
                  className={`p-3 cursor-pointer transition-colors ${reassignTarget?._id === c._id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/50"}`}
                >
                  <div className="font-medium text-foreground">{c.customerName || "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.primaryMobile || ""} {c.city ? ` • ${c.city}` : ""}</div>
                </div>
              ))}
            </div>
            {reassignTarget && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Loans will be reassigned to: <strong>{reassignTarget.customerName}</strong>
              </p>
            )}
          </div>
        )}
      </Modal>

      <CustomerViewModal
        open={isViewModalOpen}
        customer={selectedCustomer}
        onClose={() => closeViewModal()}
        onEdit={() => {
          if (selectedCustomer) {
            handleEditCustomer(selectedCustomer);
            closeViewModal();
          }
        }}
      />
    </div>
  );
};

export default CustomerDashboard;
