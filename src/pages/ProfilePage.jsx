import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import {
  Shield,
  Clock,
  Key,
  Eye,
  EyeOff,
  Save,
  BriefcaseBusiness,
  IndianRupee,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "../api/client";
import { loansApi } from "../api/loans";
import { insuranceApi } from "../api/insurance";
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
  superadmin: {
    label: "Superadmin",
    color:
      "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-700",
  },
  admin: {
    label: "Admin",
    color:
      "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-700",
  },
  staff: {
    label: "Staff",
    color:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700",
  },
  user: {
    label: "User",
    color: "bg-muted text-muted-foreground ring-1 ring-border",
  },
  demo: {
    label: "Demo",
    color:
      "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-700",
  },
};

const STATUS_META = {
  active: {
    label: "Active",
    dot: "bg-emerald-400",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    color: "text-amber-600 dark:text-amber-400",
  },
  deactivated: {
    label: "Deactivated",
    dot: "bg-slate-400",
    color: "text-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-400",
    color: "text-red-600 dark:text-red-400",
  },
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const toINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const toNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

// ─── Component ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user: userData, loading, refreshUser } = useAuth();

  const hue = nameToHue(userData?.name);
  const initials = getInitials(userData?.name);
  const roleMeta = ROLE_META[userData?.role] || ROLE_META.staff;
  const statusMeta = STATUS_META[userData?.status] || STATUS_META.active;

  // Only allow password change for non-Firebase users (users with a password)
  const isFirebaseUser =
    Boolean(userData?.firebaseUid) && !userData?.hasPassword;

  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [staffStatsLoading, setStaffStatsLoading] = useState(false);
  const [staffStats, setStaffStats] = useState({
    totalLeadsFiled: 0,
    totalInsuranceFiled: 0,
    completedLoans: 0,
    pendingLoans: 0,
    totalFinanceExpected: 0,
    totalFinanceDisbursed: 0,
  });

  const handlePasswordChange = async () => {
    const currentPassword = String(pwForm.current || "").trim();
    const nextPassword = String(pwForm.next || "").trim();
    const confirmPassword = String(pwForm.confirm || "").trim();

    if (!currentPassword || !nextPassword || !confirmPassword) {
      message.error("All fields are required");
      return;
    }
    if (nextPassword !== confirmPassword) {
      message.error("New passwords do not match");
      return;
    }
    if (nextPassword.length < 6) {
      message.error("Password must be at least 6 characters");
      return;
    }
    if (currentPassword === nextPassword) {
      message.error("New password must be different from current password");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put("/api/auth/change-password", {
        currentPassword,
        newPassword: nextPassword,
      });
      await refreshUser?.();
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

  const isStaffView = useMemo(
    () =>
      ["staff", "admin", "superadmin"].includes(
        String(userData?.role || "").toLowerCase(),
      ),
    [userData?.role],
  );
  const avatarUrl = String(userData?.avatarUrl || "").trim();
  const showAvatarImage = Boolean(avatarUrl) && !avatarBroken;

  useEffect(() => {
    if (!isStaffView || !userData?.name) return;
    let ignore = false;

    const run = async () => {
      setStaffStatsLoading(true);
      try {
        const [loanRes, insuranceRes] = await Promise.all([
          loansApi.getAll({
            limit: 1000,
            sortBy: "updatedAt",
            sortDir: "desc",
            noCount: true,
          }),
          insuranceApi.getAll({ limit: 1000, skip: 0 }),
        ]);

        const allLoans = Array.isArray(loanRes?.data?.data)
          ? loanRes.data.data
          : Array.isArray(loanRes?.data)
            ? loanRes.data
            : [];
        const allInsurance = Array.isArray(insuranceRes?.data?.data)
          ? insuranceRes.data.data
          : Array.isArray(insuranceRes?.data)
            ? insuranceRes.data
            : [];

        const me = normalize(userData?.name);
        const myLoans = allLoans.filter((loan) => {
          const mapped = [
            loan?.dealtBy,
            loan?.salesExecutive,
            loan?.employeeName,
            loan?.createdByName,
            loan?.leadBy,
          ].map(normalize);
          return mapped.includes(me);
        });
        const myInsurance = allInsurance.filter(
          (row) => normalize(row?.employeeName) === me,
        );

        const completedLoans = myLoans.filter((loan) => {
          const status = normalize(
            loan?.disburse_status || loan?.disbursementStatus || loan?.status,
          );
          return status.includes("disburs") || status === "completed";
        }).length;

        const pendingLoans = Math.max(myLoans.length - completedLoans, 0);
        const totalFinanceExpected = myLoans.reduce(
          (sum, loan) =>
            sum + toNumber(loan?.financeExpectation ?? loan?.loanAmount),
          0,
        );
        const totalFinanceDisbursed = myLoans.reduce(
          (sum, loan) =>
            sum +
            toNumber(
              loan?.disburse_amount ??
                loan?.disburseAmount ??
                loan?.approval_loanAmountDisbursed ??
                loan?.postfile_loanAmountDisbursed,
            ),
          0,
        );

        if (ignore) return;
        setStaffStats({
          totalLeadsFiled: myLoans.length,
          totalInsuranceFiled: myInsurance.length,
          completedLoans,
          pendingLoans,
          totalFinanceExpected,
          totalFinanceDisbursed,
        });
      } catch {
        if (!ignore) {
          setStaffStats({
            totalLeadsFiled: 0,
            totalInsuranceFiled: 0,
            completedLoans: 0,
            pendingLoans: 0,
            totalFinanceExpected: 0,
            totalFinanceDisbursed: 0,
          });
        }
      } finally {
        if (!ignore) setStaffStatsLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [isStaffView, userData?.name]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-14 pt-3 md:px-6">
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="h-56 animate-pulse rounded-3xl border border-border bg-card" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pb-14 pt-3 md:px-6">
      {/* Page title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Account Center
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account information, access role and productivity snapshot
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Session Status
          </p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {statusMeta.label}
          </p>
        </div>
      </div>

      {/* Profile hero */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_40px_rgba(2,6,23,0.08)]">
        <div className="relative bg-gradient-to-r from-cyan-500 via-slate-700 to-emerald-500 px-6 py-6 text-white dark:from-cyan-600 dark:via-slate-800 dark:to-emerald-600 md:px-7 md:py-7">
          <div className="pointer-events-none absolute right-6 top-3 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute right-28 top-10 h-14 w-14 rounded-full bg-white/10 blur-xl" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-white/20 text-4xl font-black text-white shadow-xl"
                style={{ backgroundColor: `hsl(${hue}, 55%, 46%)` }}
              >
                {showAvatarImage ? (
                  <img
                    src={avatarUrl}
                    alt={`${userData?.name || "User"} profile`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Profile Overview
                </p>
                <h2 className="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">
                  {userData?.name || "—"}
                </h2>
                <p className="mt-1 truncate text-sm text-white/80">
                  {userData?.email || "—"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${roleMeta.color}`}
                  >
                    {roleMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[18rem] lg:grid-cols-1">
              <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  Status
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {statusMeta.label}
                </p>
              </div>
              <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  Member Since
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {userData?.createdAt ? formatDate(userData.createdAt) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/70 bg-card px-4 py-4 md:grid-cols-4 md:px-6">
          {[
            { label: "Full Name", value: userData?.name || "—" },
            { label: "Email Address", value: userData?.email || "—" },
            { label: "Role", value: roleMeta.label },
            { label: "Status", value: statusMeta.label },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border bg-muted/20 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Access / Security bento */}
        <div className="space-y-5 xl:col-span-5">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-bold text-foreground">
                Access & Security
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign-in method and account protection.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Current Role
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {roleMeta.label}
                    </p>
                  </div>
                  <div className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {statusMeta.label}
                  </div>
                </div>
              </div>

              {isFirebaseUser ? (
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3.5 sm:col-span-2 xl:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sign-in method
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    Google sign-in
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Password management is handled through your Google account.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 sm:col-span-2 xl:col-span-1">
                  <button
                    onClick={() => setShowPwSection((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
                        <Key
                          size={16}
                          className="text-cyan-600 dark:text-cyan-300"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">
                          Change Password
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Update your login credentials
                        </p>
                      </div>
                    </div>
                    <ChevronIcon open={showPwSection} />
                  </button>

                  {showPwSection && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Current Password
                        </label>
                        <PasswordInput
                          field="current"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          New Password
                        </label>
                        <PasswordInput
                          field="next"
                          placeholder="At least 6 characters"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Confirm New Password
                        </label>
                        <PasswordInput
                          field="confirm"
                          placeholder="Repeat new password"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handlePasswordChange}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"
                        >
                          <Save size={14} />
                          {saving ? "Saving…" : "Update Password"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:from-white/[0.04] dark:to-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Profile Notes
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your profile summary is shown above, so this section keeps only
              the action-oriented stuff here—cleaner, faster, and less déjà vu.
            </p>
          </div>
        </div>

        {/* Activity bento */}
        <div className="space-y-5 xl:col-span-7">
          {isStaffView && (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-sm font-bold text-foreground">
                  Performance Snapshot
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Activity linked to {userData?.name || "you"} across loans and
                  finance.
                </p>
              </div>
              <div className="p-4">
                {staffStatsLoading ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {[
                      {
                        label: "Total Leads",
                        value: staffStats.totalLeadsFiled,
                        icon: BriefcaseBusiness,
                      },
                      {
                        label: "Insurance Cases",
                        value: staffStats.totalInsuranceFiled,
                        icon: Shield,
                      },
                      {
                        label: "Completed Loans",
                        value: staffStats.completedLoans,
                        icon: CheckCircle2,
                      },
                      {
                        label: "Pending Loans",
                        value: staffStats.pendingLoans,
                        icon: Clock,
                      },
                      {
                        label: "Finance Expected",
                        value: toINR(staffStats.totalFinanceExpected),
                        icon: TrendingUp,
                      },
                      {
                        label: "Finance Disbursed",
                        value: toINR(staffStats.totalFinanceDisbursed),
                        icon: IndianRupee,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <span className="rounded-lg bg-white/70 p-2 text-muted-foreground ring-1 ring-border dark:bg-white/[0.04]">
                            <Icon size={14} />
                          </span>
                        </div>
                        <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isStaffView && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Account Status
                </p>
                <p className="mt-2 text-lg font-black text-foreground">
                  {statusMeta.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your profile is active and ready for daily work.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Member Since
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {userData?.createdAt ? formatDate(userData.createdAt) : "—"}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Access Role
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {roleMeta.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
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
