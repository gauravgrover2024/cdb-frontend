// src/modules/bookings/pages/BookingsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Tag, Button, Input, Select, Space, message } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { bookingsApi } from "../../../api/bookings";

const { Option } = Select;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));
const money = (n) => {
  const num = Math.trunc(Number(n) || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

const STATUS_COLOR = { Open: "blue", Converted: "green", Cancelled: "red" };

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const BookingsDashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Open");

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list({ limit: 500, skip: 0, noCount: true });
      setBookings(listFromResponse(res));
    } catch (err) {
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "ALL" && safeText(b.status).toUpperCase() !== statusFilter.toUpperCase()) return false;
      if (search) {
        const blob = `${b.bookingId} ${b.customerName} ${b.vehicleMake} ${b.vehicleModel} ${b.showroomName}`.toLowerCase();
        if (!blob.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => {
    const open = bookings.filter((b) => safeText(b.status).toLowerCase() === "open").length;
    const converted = bookings.filter((b) => safeText(b.status).toLowerCase() === "converted").length;
    const cancelled = bookings.filter((b) => safeText(b.status).toLowerCase() === "cancelled").length;
    return { total: bookings.length, open, converted, cancelled };
  }, [bookings]);

  const columns = [
    {
      title: "Booking",
      key: "booking",
      width: 220,
      fixed: "left",
      render: (_, b) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm">{b.bookingId || "—"}</span>
          <span className="text-xs text-muted-foreground">{safeText(b.customerName)}</span>
          <span className="text-xs text-muted-foreground">{safeText(b.customerPhone)}</span>
        </div>
      ),
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 200,
      render: (_, b) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{[b.vehicleMake, b.vehicleModel, b.vehicleVariant].filter(Boolean).join(" ") || "—"}</span>
          <span className="text-xs text-muted-foreground">{safeText(b.vehicleColor)} {b.regCity ? `· ${b.regCity}` : ""}</span>
        </div>
      ),
    },
    {
      title: "Showroom",
      key: "showroom",
      width: 180,
      render: (_, b) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{safeText(b.showroomName) || "—"}</span>
          <span className="text-xs text-muted-foreground">{safeText(b.showroomContactPerson)}</span>
        </div>
      ),
    },
    {
      title: "Booking Amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (_, b) => (
        <div className="flex flex-col gap-0.5 text-right">
          <span className="font-semibold">{b.bookingAmount ? money(b.bookingAmount) : "—"}</span>
          <span className="text-xs text-muted-foreground">{b.bookingDate ? dayjs(b.bookingDate).format("DD MMM YYYY") : ""}</span>
        </div>
      ),
    },
    {
      title: "Ex-Showroom",
      key: "exShowroom",
      width: 130,
      align: "right",
      render: (_, b) => b.exShowroomPrice ? money(b.exShowroomPrice) : "—",
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      align: "center",
      render: (_, b) => (
        <Tag color={STATUS_COLOR[b.status] || "default"}>{safeText(b.status) || "Open"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, b) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/bookings/${b.bookingId || b._id}`)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/bookings/edit/${b.bookingId || b._id}`)}>Edit</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-6 bg-slate-50 dark:bg-[#171717] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Manage Bookings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage all vehicle bookings</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/bookings/new")}>New Booking</Button>
        </Space>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, filter: "ALL", color: "from-slate-500 to-slate-700" },
          { label: "Open", value: stats.open, filter: "Open", color: "from-blue-500 to-indigo-600" },
          { label: "Converted", value: stats.converted, filter: "Converted", color: "from-emerald-500 to-green-600" },
          { label: "Cancelled", value: stats.cancelled, filter: "Cancelled", color: "from-rose-500 to-red-600" },
        ].map((s) => (
          <button
            key={s.filter}
            type="button"
            onClick={() => setStatusFilter(s.filter)}
            className={`relative text-left overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} p-4 shadow-lg transition-all hover:-translate-y-1 focus:outline-none ${statusFilter === s.filter ? "ring-2 ring-white/50" : ""}`}
          >
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/70">{s.label}</p>
            <p className="mt-1 text-3xl font-black text-white">{s.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by Booking ID, Customer, Vehicle, Showroom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="large"
            />
          </div>
          <Select value={statusFilter} onChange={setStatusFilter} size="large" className="w-full">
            <Option value="ALL">All Status</Option>
            <Option value="Open">Open</Option>
            <Option value="Converted">Converted</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl overflow-hidden shadow-sm">
        <Table
          rowKey={(r) => r.bookingId || r._id}
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `Total ${t} bookings`, showSizeChanger: true }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </div>
    </div>
  );
};

export default BookingsDashboard;
