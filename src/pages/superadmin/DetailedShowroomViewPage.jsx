import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Spin } from "antd";
import { ArrowLeft, Pencil, Save, X, Store, MapPin, Briefcase, CreditCard, Percent, Clock } from "lucide-react";
import { showroomsApi } from "../../api/showrooms";

const DetailedShowroomViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showroom, setShowroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    brands: [],
    bankName: "",
    ifscCode: "",
    accountHolderName: "",
    commissionRate: 0,
    status: "Active",
  });

  const parseShowroomDetailResponse = (res) => {
    if (res?.data && res.data.data) return res.data.data;
    if (res?.data && !Array.isArray(res.data)) return res.data;
    return null;
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => { loadShowroom(); }, [id]);

  const loadShowroom = async () => {
    setLoading(true);
    try {
      const res = await showroomsApi.getById(id);
      const showroom = parseShowroomDetailResponse(res);
      if (showroom) {
        setShowroom(showroom);
        setFormData(showroom);
      } else {
        message.error("Showroom not found");
        navigate("/superadmin/showrooms");
      }
    } catch (error) {
      message.error("Failed to load showroom details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      message.error("Showroom name and address are required");
      return;
    }
    setSaving(true);
    try {
      const res = await showroomsApi.update(showroom._id, formData);
      const updated = parseShowroomDetailResponse(res) || formData;
      message.success("Showroom updated successfully");
      setShowroom(updated);
      setFormData(updated);
      setEditing(false);
    } catch (error) {
      message.error(error?.message || "Failed to save showroom");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <p className="text-sm text-muted-foreground">Loading showroom…</p>
        </div>
      </div>
    );
  }

  if (!showroom) return null;

  const totalCommissionReceivable = Number(showroom.totalCommissionReceivable || 0);
  const totalCommissionPaid = Number(showroom.totalCommissionPaid || 0);
  const isActive = String(showroom.status || "Active") === "Active";

  const ViewField = ({ value, mono }) => (
    <div className={`min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90 ${mono ? "font-mono" : ""}`}>
      {value || <span className="text-muted-foreground/40">—</span>}
    </div>
  );

  const EditField = ({ field, value, type = "text", placeholder }) => (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => update(field, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
    />
  );

  const FieldRow = ({ label, field, value, mono, type, placeholder, fullWidth }) => (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      {editing ? (
        <EditField field={field} value={formData[field]} type={type} placeholder={placeholder} />
      ) : (
        <ViewField value={value ?? formData[field]} mono={mono} />
      )}
    </div>
  );

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="col-span-2 flex items-center gap-2 border-t border-border pt-4">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{title}</h4>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-muted"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Showrooms</span>
        <span className="text-sm text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground">{showroom.name}</span>
      </div>

      {/* Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Hero Banner */}
        <div className="border-b border-border bg-gradient-to-r from-indigo-50 via-card to-card px-6 py-5 dark:from-indigo-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 shadow-sm dark:bg-indigo-950/50">
                <Store size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">{showroom.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    ID: <span className="font-mono font-medium text-foreground/80">{showroom.showroomId || "—"}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                    {showroom.status || "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Pencil size={14} />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setEditing(false); setFormData(showroom); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metric Tiles */}
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
              {showroom.status || "Active"}
            </span>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
            <p className="mt-1.5 text-lg font-black text-amber-600 dark:text-amber-400">
              ₹{(showroom.outstandingCommission || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receivable</p>
            <p className="mt-1.5 text-lg font-black text-indigo-600 dark:text-indigo-400">
              ₹{totalCommissionReceivable.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="mt-1.5 text-lg font-black text-emerald-600 dark:text-emerald-400">
              ₹{totalCommissionPaid.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <SectionHeader icon={Store} title="Basic Information" />
            <FieldRow label="Showroom Name" field="name" />
            <FieldRow label="Business Name" field="businessName" />
            <FieldRow label="Contact Person" field="contactPerson" />
            <FieldRow label="Mobile" field="mobile" />
            <FieldRow label="Email" field="email" fullWidth />

            <SectionHeader icon={MapPin} title="Address" />
            <FieldRow label="Address" field="address" fullWidth />
            <FieldRow label="City" field="city" />
            <FieldRow label="State" field="state" />
            <FieldRow label="Pincode" field="pincode" />

            <SectionHeader icon={Briefcase} title="Business Details" />
            <FieldRow label="GST Number" field="gstNumber" mono />
            <FieldRow label="PAN Number" field="panNumber" mono />
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Brands</label>
              {editing ? (
                <input
                  type="text"
                  value={(formData.brands || []).join(", ")}
                  onChange={(e) => update("brands", e.target.value.split(",").map((b) => b.trim()))}
                  placeholder="Comma-separated brands, e.g. Honda, Toyota"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(formData.brands || []).length > 0 ? (
                    formData.brands.map((b, i) => (
                      <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                        {b}
                      </span>
                    ))
                  ) : (
                    <div className="min-h-[38px] w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground/40">—</div>
                  )}
                </div>
              )}
            </div>

            <SectionHeader icon={CreditCard} title="Banking Details" />
            <FieldRow label="Bank Name" field="bankName" />
            <FieldRow label="IFSC Code" field="ifscCode" mono />
            <FieldRow label="Account Holder Name" field="accountHolderName" fullWidth />

            <SectionHeader icon={Percent} title="Commission" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Commission Rate (%)</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.commissionRate || 0}
                  onChange={(e) => update("commissionRate", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                />
              ) : (
                <div className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  {formData.commissionRate || 0}%
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Outstanding Commission</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                ₹{(showroom.outstandingCommission || 0).toLocaleString("en-IN")}
              </div>
            </div>

            <SectionHeader icon={Clock} title="Metadata" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Created</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
                {formatDate(showroom.createdAt)}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Last Updated</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
                {formatDate(showroom.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedShowroomViewPage;
