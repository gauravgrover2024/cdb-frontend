import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { message, Spin } from "antd";
import { ArrowLeft, Pencil, Save, X, Landmark, MapPin, Phone, Clock, Building2 } from "lucide-react";
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

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const DetailedBankViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackBankFromList = location?.state?.bank || null;
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ifsc: "",
    micr: "",
    branch: "",
    address: "",
    city: "",
    state: "",
    district: "",
    contact: "",
    active: true,
  });

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => { loadBank(); }, [id]);

  const loadBank = async () => {
    setLoading(true);
    try {
      const res = await banksApi.getAll({ id, limit: 1, fields: "detail" });
      const bank = Array.isArray(res?.data) ? res.data[0] : null;
      if (bank) {
        setBank(bank);
        setFormData(bank);
      } else {
        if (fallbackBankFromList) {
          setBank(fallbackBankFromList);
          setFormData(fallbackBankFromList);
        } else {
          message.error("Bank not found");
          navigate("/superadmin/banks");
        }
      }
    } catch (error) {
      if (fallbackBankFromList) {
        setBank(fallbackBankFromList);
        setFormData(fallbackBankFromList);
      } else {
        message.error("Failed to load bank details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.ifsc) {
      message.error("Bank name and IFSC are required");
      return;
    }
    setSaving(true);
    try {
      await banksApi.update(bank._id, formData);
      message.success("Bank updated successfully");
      setBank(formData);
      setEditing(false);
    } catch (error) {
      message.error(error?.message || "Failed to save bank");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <p className="text-sm text-muted-foreground">Loading bank details…</p>
        </div>
      </div>
    );
  }

  if (!bank) return null;

  const displayName = getDisplayBankName(formData);
  const isActive = formData.active !== false;

  const ViewField = ({ value, mono }) => (
    <div className={`min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90 ${mono ? "font-mono tracking-wide" : ""}`}>
      {value || <span className="text-muted-foreground/40">—</span>}
    </div>
  );

  const EditField = ({ field, value, mono, placeholder, uppercase }) => (
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => update(field, uppercase ? e.target.value.toUpperCase() : e.target.value)}
      className={`w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 ${mono ? "font-mono tracking-wide" : ""}`}
    />
  );

  const FieldRow = ({ label, field, mono, placeholder, uppercase, fullWidth }) => (
    <div className={fullWidth ? "col-span-2 sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      {editing ? (
        <EditField field={field} value={formData[field]} mono={mono} placeholder={placeholder} uppercase={uppercase} />
      ) : (
        <ViewField value={formData[field]} mono={mono} />
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
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
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
        <span className="text-sm text-muted-foreground">Banks</span>
        <span className="text-sm text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground line-clamp-1">{displayName}</span>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Hero Banner */}
        <div className="border-b border-border bg-gradient-to-r from-indigo-50 via-card to-card px-6 py-5 dark:from-indigo-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <BankLogoBadge bankName={displayName} size={52} />
              <div>
                <h2 className="text-xl font-black text-foreground">{displayName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground/80">
                    {formData.ifsc || "No IFSC"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                    {isActive ? "Active" : "Inactive"}
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
                    onClick={() => { setEditing(false); setFormData(bank); }}
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
        <div className="grid grid-cols-3 gap-px bg-border">
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
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Verified</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{formatDate(bank.lastVerifiedAt)}</p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created On</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{formatDate(bank.createdAt)}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <SectionHeader icon={Landmark} title="Identity" />
            <FieldRow label="Bank Name" field="name" placeholder="e.g. HDFC Bank" />
            <FieldRow label="IFSC Code" field="ifsc" mono uppercase placeholder="e.g. HDFC0001234" />
            <FieldRow label="MICR Code" field="micr" mono placeholder="9-digit MICR" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Status</label>
              {editing ? (
                <select
                  value={formData.active ? "Active" : "Inactive"}
                  onChange={(e) => update("active", e.target.value === "Active")}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              ) : (
                <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                  {formData.active ? "Active" : "Inactive"}
                </div>
              )}
            </div>

            <SectionHeader icon={Building2} title="Branch & Location" />
            <FieldRow label="Branch Name" field="branch" placeholder="Branch name" />
            <FieldRow label="Address" field="address" placeholder="Street address" />
            <FieldRow label="City" field="city" placeholder="City" />
            <FieldRow label="District" field="district" placeholder="District" />
            <FieldRow label="State" field="state" placeholder="State" fullWidth />

            <SectionHeader icon={Phone} title="Contact" />
            <FieldRow label="Contact Number" field="contact" placeholder="Phone number" fullWidth />

            <SectionHeader icon={Clock} title="Metadata" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Created</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
                {formatDate(bank.createdAt)}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Last Updated</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
                {formatDate(bank.updatedAt)}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Last Verified</label>
              <div className="min-h-[38px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/70">
                {formatDate(bank.lastVerifiedAt)}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Record ID</label>
              <div className="min-h-[38px] truncate rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground/70">
                {String(bank._id || "—")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedBankViewPage;
