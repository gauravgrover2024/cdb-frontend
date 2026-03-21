import React, { useState } from "react";
import { message } from "antd";
import { UserCircle2, Mail, Shield, Clock, Key, Eye, EyeOff, Save } from "lucide-react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

const nameToHue = (name) => {
  const str = String(name || "?");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

const getInitials = (name) => {
  const str = String(name || "").trim();
  if (!str) return "?";
  const parts = str.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
};

const ROLE_META = {
  superadmin: { label: "Superadmin", color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-700" },
  admin:       { label: "Admin",      color: "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-700" },
  staff:       { label: "Staff",      color: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700" },
  user:        { label: "User",       color: "bg-muted text-muted-foreground ring-1 ring-border" },
  demo:        { label: "Demo",       color: "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-700" },
};

const STATUS_META = {
  active:      { label: "Active",      dot: "bg-emerald-400", color: "text-emerald-600 dark:text-emerald-400" },
  pending:     { label: "Pending",     dot: "bg-amber-400",   color: "text-amber-600 dark:text-amber-400"   },
  deactivated: { label: "Deactivated", dot: "bg-slate-400",   color: "text-muted-foreground"                },
  rejected:    { label: "Rejected",    dot: "bg-red-400",     color: "text-red-600 dark:text-red-400"       },
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

// ─── Component ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user: userData } = useAuth();

  const hue = nameToHue(userData?.name);
  const initials = getInitials(userData?.name);
  const roleMeta = ROLE_META[userData?.role] || ROLE_META.staff;
  const statusMeta = STATUS_META[userData?.status] || STATUS_META.active;

  // Only allow password change for non-Firebase users (users with a password)
  const isFirebaseUser = Boolean(userData?.firebaseUid) && !userData?.hasPassword;

  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      message.error("All fields are required");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      message.error("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 6) {
      message.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem("token");
      await apiClient.put(
        "/api/auth/change-password",
        { currentPassword: pwForm.current, newPassword: pwForm.next },
        { Authorization: `Bearer ${token}` }
      );
      message.success("Password changed successfully");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPwSection(false);
    } catch (err) {
      message.error(err?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (field) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const PasswordInput = ({ field, placeholder }) => (
    <div className="relative">
      <input
        type={showPasswords[field] ? "text" : "password"}
        placeholder={placeholder}
        value={pwForm[field]}
        onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
      />
      <button
        type="button"
        onClick={() => toggleShow(field)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
      >
        {showPasswords[field] ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12 pt-2">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-black text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Account information and settings</p>
      </div>

      {/* Identity card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 opacity-80 dark:opacity-60" />

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="relative -mt-10 mb-4 flex items-end justify-between">
            {/* Large avatar */}
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card text-2xl font-black text-white shadow-lg"
              style={{ backgroundColor: `hsl(${hue}, 55%, 46%)` }}
            >
              {initials}
            </div>
            {/* Online badge */}
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Online
            </span>
          </div>

          <h2 className="text-xl font-black text-foreground">{userData?.name || "—"}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{userData?.email || "—"}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${roleMeta.color}`}>
              {roleMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusMeta.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold text-foreground">Account Details</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            { icon: UserCircle2, label: "Full Name",     value: userData?.name   || "—" },
            { icon: Mail,        label: "Email Address", value: userData?.email  || "—" },
            { icon: Shield,      label: "Role",          value: roleMeta.label            },
            {
              icon: Clock,
              label: "Member Since",
              value: userData?.createdAt ? formatDate(userData.createdAt) : "—",
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon size={15} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change password — hide for Firebase-only users */}
      {!isFirebaseUser && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <button
            onClick={() => setShowPwSection((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                <Key size={15} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your login credentials</p>
              </div>
            </div>
            <ChevronIcon open={showPwSection} />
          </button>

          {showPwSection && (
            <div className="border-t border-border px-5 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Password
                </label>
                <PasswordInput field="current" placeholder="Enter current password" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  New Password
                </label>
                <PasswordInput field="next" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Confirm New Password
                </label>
                <PasswordInput field="confirm" placeholder="Repeat new password" />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Saving…" : "Update Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sign in method info for Firebase users */}
      {isFirebaseUser && (
        <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Signed in with Google</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your account uses Google sign-in. Password management is handled through your Google account.
          </p>
        </div>
      )}
    </div>
  );
};

// Small inline chevron component
const ChevronIcon = ({ open }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default ProfilePage;
