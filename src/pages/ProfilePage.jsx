import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  IndianRupee,
  KeyRound,
  Mail,
  Save,
  Shield,
  TrendingUp,
  UserRound,
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
  superadmin: { label: "Superadmin", className: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" },
  admin: { label: "Admin", className: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30" },
  staff: { label: "Staff", className: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30" },
  user: { label: "User", className: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30" },
  demo: { label: "Demo", className: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30" },
};

const STATUS_META = {
  active: { label: "Active", dot: "bg-emerald-500", className: "text-emerald-700 dark:text-emerald-300" },
  pending: { label: "Pending approval", dot: "bg-amber-500", className: "text-amber-700 dark:text-amber-300" },
  deactivated: { label: "Deactivated", dot: "bg-slate-400", className: "text-slate-500 dark:text-slate-400" },
  rejected: { label: "Rejected", dot: "bg-rose-500", className: "text-rose-700 dark:text-rose-300" },
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const toINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const titleCase = (value) => String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const EMPTY_STATS = {
  totalLeadsFiled: 0,
  totalInsuranceFiled: 0,
  completedLoans: 0,
  pendingLoans: 0,
  totalFinanceExpected: 0,
  totalFinanceDisbursed: 0,
};

const CARD = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
const LABEL = "text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

// Defined outside ProfilePage so it keeps a stable identity across renders —
// declaring it inside the component made React remount the <input> (and drop
// focus) on every keystroke, since each render produced a "new" component type.
const PasswordInput = ({ id, label, value, onChange, show, onToggleShow, placeholder, autoComplete }) => (
  <div>
    <label htmlFor={id} className={`mb-1.5 block ${LABEL}`}>{label}</label>
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-500/20"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 py-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon size={15} />
    </span>
    <div className="min-w-0 flex-1">
      <p className={LABEL}>{label}</p>
      <div className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{children}</div>
    </div>
  </div>
);

// ─── Component ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user: userData, loading, refreshUser } = useAuth();

  const hue = nameToHue(userData?.name);
  const initials = getInitials(userData?.name);
  const roleMeta = ROLE_META[userData?.role] || ROLE_META.staff;
  const statusMeta = STATUS_META[userData?.status] || STATUS_META.active;

  // Only allow password change for non-Firebase users (users with a password)
  const isFirebaseUser = Boolean(userData?.firebaseUid) && !userData?.hasPassword;

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [staffStatsLoading, setStaffStatsLoading] = useState(false);
  const [staffStats, setStaffStats] = useState(EMPTY_STATS);

  const handlePasswordChange = async (event) => {
    event?.preventDefault();
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
      await apiClient.put("/api/auth/change-password", { currentPassword, newPassword: nextPassword });
      await refreshUser?.();
      message.success("Password changed successfully");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      message.error(err?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (field) => setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const isStaffView = useMemo(
    () => ["staff", "admin", "superadmin"].includes(String(userData?.role || "").toLowerCase()),
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
          loansApi.getAll({ limit: 1000, sortBy: "updatedAt", sortDir: "desc", noCount: true }),
          insuranceApi.getAll({ limit: 200, skip: 0 }),
        ]);

        const allLoans = Array.isArray(loanRes?.data?.data) ? loanRes.data.data : Array.isArray(loanRes?.data) ? loanRes.data : [];
        const allInsurance = Array.isArray(insuranceRes?.data?.data)
          ? insuranceRes.data.data
          : Array.isArray(insuranceRes?.data)
            ? insuranceRes.data
            : [];

        const me = normalize(userData?.name);
        const myLoans = allLoans.filter((loan) =>
          [loan?.dealtBy, loan?.salesExecutive, loan?.employeeName, loan?.createdByName, loan?.leadBy].map(normalize).includes(me),
        );
        const myInsurance = allInsurance.filter((row) => normalize(row?.employeeName) === me);

        const completedLoans = myLoans.filter((loan) => {
          const status = normalize(loan?.disburse_status || loan?.disbursementStatus || loan?.status);
          return status.includes("disburs") || status === "completed";
        }).length;

        const pendingLoans = Math.max(myLoans.length - completedLoans, 0);
        const totalFinanceExpected = myLoans.reduce((sum, loan) => sum + toNumber(loan?.financeExpectation ?? loan?.loanAmount), 0);
        const totalFinanceDisbursed = myLoans.reduce(
          (sum, loan) =>
            sum +
            toNumber(loan?.disburse_amount ?? loan?.disburseAmount ?? loan?.approval_loanAmountDisbursed ?? loan?.postfile_loanAmountDisbursed),
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
        if (!ignore) setStaffStats(EMPTY_STATS);
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
      <div className="w-full space-y-4 pb-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900 xl:col-span-8" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900 xl:col-span-4" />
        </div>
      </div>
    );
  }

  const conversionRate = staffStats.totalLeadsFiled
    ? Math.round((staffStats.completedLoans / staffStats.totalLeadsFiled) * 100)
    : 0;
  const disbursalRate = staffStats.totalFinanceExpected
    ? Math.min(100, Math.round((staffStats.totalFinanceDisbursed / staffStats.totalFinanceExpected) * 100))
    : 0;

  const kpis = [
    { label: "Loan files", value: staffStats.totalLeadsFiled, icon: BriefcaseBusiness, tone: "text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300" },
    { label: "Disbursed", value: staffStats.completedLoans, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "In process", value: staffStats.pendingLoans, icon: Clock, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300" },
    { label: "Insurance cases", value: staffStats.totalInsuranceFiled, icon: Shield, tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300" },
    { label: "Finance expected", value: toINR(staffStats.totalFinanceExpected), icon: TrendingUp, tone: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
    { label: "Finance disbursed", value: toINR(staffStats.totalFinanceDisbursed), icon: IndianRupee, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300" },
  ];

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">Account Center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Account information, access role and productivity snapshot</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          <span className={statusMeta.className}>{statusMeta.label}</span>
        </span>
      </div>

      {/* Identity */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="h-20 bg-gradient-to-r from-sky-600 via-sky-500 to-emerald-500 md:h-24" />
        <div className="flex flex-col gap-6 px-5 pb-5 md:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end md:-mt-12">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white text-3xl font-bold text-white shadow-md dark:border-slate-950 md:h-28 md:w-28"
              style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
            >
              {showAvatarImage ? (
                <img src={avatarUrl} alt={`${userData?.name || "User"} profile`} className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-50 md:text-2xl">{userData?.name || "—"}</h2>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{userData?.email || "—"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleMeta.className}`}>
                  <BadgeCheck size={13} /> {roleMeta.label}
                </span>
                {userData?.department && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    <Building2 size={13} /> {titleCase(userData.department)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4 lg:min-w-[34rem]">
            {[
              { label: "Role", value: roleMeta.label },
              { label: "Workspace", value: userData?.department ? titleCase(userData.department) : "All workspaces" },
              { label: "Member since", value: formatDate(userData?.createdAt) },
              { label: "Last updated", value: formatDate(userData?.updatedAt) },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-3 dark:bg-slate-950">
                <dt className={LABEL}>{item.label}</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Performance */}
        <div className="space-y-5 xl:col-span-8">
          {isStaffView ? (
            <section className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Performance snapshot</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Files linked to {userData?.name || "you"} across loans and insurance.</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                  {kpis.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <p className={LABEL}>{label}</p>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}><Icon size={14} /></span>
                      </div>
                      {staffStatsLoading ? (
                        <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      ) : (
                        <p className="mt-3 truncate text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50 md:text-2xl">{value}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    { label: "Disbursal conversion", hint: `${staffStats.completedLoans} of ${staffStats.totalLeadsFiled} loan files disbursed`, percent: conversionRate, bar: "bg-emerald-500" },
                    { label: "Finance realised", hint: `${toINR(staffStats.totalFinanceDisbursed)} of ${toINR(staffStats.totalFinanceExpected)} expected`, percent: disbursalRate, bar: "bg-sky-500" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-50">{staffStatsLoading ? "—" : `${item.percent}%`}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${item.bar} transition-all`} style={{ width: `${staffStatsLoading ? 0 : item.percent}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                  Calculated from the latest 1,000 loan files and 200 insurance cases where you are recorded as the executive.
                </p>
              </div>
            </section>
          ) : (
            <section className={`${CARD} p-5`}>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Account status</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your account is <span className={`font-semibold ${statusMeta.className}`}>{statusMeta.label.toLowerCase()}</span>.
              </p>
            </section>
          )}

          <section className={CARD}>
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Security</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sign-in method and password.</p>
            </div>
            {isFirebaseUser ? (
              <div className="flex items-start gap-3 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><KeyRound size={16} /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google sign-in</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your password is managed through your Google account.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <PasswordInput
                    id="current-password"
                    label="Current password"
                    autoComplete="current-password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                    show={showPasswords.current}
                    onToggleShow={() => toggleShow("current")}
                    placeholder="Enter current password"
                  />
                  <PasswordInput
                    id="new-password"
                    label="New password"
                    autoComplete="new-password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                    show={showPasswords.next}
                    onToggleShow={() => toggleShow("next")}
                    placeholder="At least 6 characters"
                  />
                  <PasswordInput
                    id="confirm-password"
                    label="Confirm new password"
                    autoComplete="new-password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                    show={showPasswords.confirm}
                    onToggleShow={() => toggleShow("confirm")}
                    placeholder="Repeat new password"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use a unique password you don&apos;t use anywhere else.</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={15} />
                    {saving ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* Account details */}
        <aside className="xl:col-span-4">
          <section className={`${CARD} xl:sticky xl:top-4`}>
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Account details</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Only you can see this page.</p>
            </div>
            <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
              <DetailRow icon={UserRound} label="Full name">{userData?.name || "—"}</DetailRow>
              <DetailRow icon={Mail} label="Email">{userData?.email || "—"}</DetailRow>
              <DetailRow icon={BadgeCheck} label="Access role">{roleMeta.label}</DetailRow>
              <DetailRow icon={Building2} label="Workspace">{userData?.department ? titleCase(userData.department) : "All workspaces"}</DetailRow>
              <DetailRow icon={Shield} label="Account status">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
                  <span className={statusMeta.className}>{statusMeta.label}</span>
                </span>
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Member since">{formatDate(userData?.createdAt)}</DetailRow>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProfilePage;
