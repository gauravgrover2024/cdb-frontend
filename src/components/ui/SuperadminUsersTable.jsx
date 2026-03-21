import React, { useMemo } from "react";
import { Select, Table, Popconfirm } from "antd";
import { CheckCircle, XCircle, Lock, Trash2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

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

const ROLE_STYLES = {
  superadmin: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  admin: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700",
  staff: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700",
  default: "bg-muted text-muted-foreground border border-border",
};

const ROLE_DOTS = {
  superadmin: "bg-amber-400",
  admin: "bg-blue-400",
  staff: "bg-emerald-400",
  default: "bg-muted-foreground/40",
};

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700",
  pending: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  rejected: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700",
  deactivated: "bg-muted text-muted-foreground border border-border",
};

const STATUS_DOTS = {
  active: "bg-emerald-400",
  pending: "bg-amber-400",
  rejected: "bg-red-400",
  deactivated: "bg-muted-foreground/40",
};

const UserAvatar = ({ name }) => {
  const hue = nameToHue(name);
  const initials = getInitials(name);
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: `hsl(${hue}, 58%, 48%)` }}
    >
      {initials}
    </div>
  );
};

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[role] || ROLE_STYLES.default}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOTS[role] || ROLE_DOTS.default}`} />
    {role ? role.charAt(0).toUpperCase() + role.slice(1) : "—"}
  </span>
);

const StatusBadge = ({ status }) => {
  const key = status || "pending";
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[key] || STATUS_STYLES.pending}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[key] || STATUS_DOTS.pending}`} />
      {label}
    </span>
  );
};

const SuperadminUsersTable = ({ users, loading, updatingById, onRoleChange, onApprove, onDeactivate, onDelete }) => {
  const columns = useMemo(
    () => [
      {
        title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</span>,
        dataIndex: "name",
        key: "name",
        width: 220,
        render: (value, record) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={value} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{value || "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{record?.email || "—"}</p>
            </div>
          </div>
        ),
      },
      {
        title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>,
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value) => <StatusBadge status={value} />,
      },
      {
        title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</span>,
        dataIndex: "role",
        key: "role",
        width: 220,
        render: (_, record) => {
          const userId = record?._id;
          const isUpdating = Boolean(updatingById?.[userId]);
          return (
            <div className="flex items-center gap-2">
              <RoleBadge role={record?.role} />
              <Select
                value={record?.role}
                size="small"
                disabled={isUpdating}
                loading={isUpdating}
                options={ROLE_OPTIONS}
                style={{ width: 120 }}
                onChange={(nextRole) => onRoleChange?.(userId, nextRole)}
              />
            </div>
          );
        },
      },
      {
        title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</span>,
        dataIndex: "createdAt",
        key: "createdAt",
        width: 110,
        render: (value) =>
          value ? (
            <span className="text-xs text-muted-foreground">
              {new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      },
      {
        title: <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>,
        key: "actions",
        width: 280,
        render: (_, record) => {
          const userId = record?._id;
          const status = record?.status || "pending";
          const isUpdating = Boolean(updatingById?.[userId]);

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {status === "pending" && (
                <>
                  <Popconfirm
                    title="Approve Account"
                    description={`Approve ${record?.name}? Their account will be activated immediately.`}
                    onConfirm={() => onApprove?.(userId, "active")}
                    okText="Yes"
                    cancelText="No"
                  >
                    <button
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-700 dark:hover:bg-emerald-950/60"
                    >
                      <CheckCircle size={13} />
                      Approve
                    </button>
                  </Popconfirm>
                  <Popconfirm
                    title="Reject Account"
                    description={`Reject ${record?.name}? They will not be able to access the system.`}
                    onConfirm={() => onApprove?.(userId, "rejected")}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <button
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-700 dark:hover:bg-red-950/60"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </Popconfirm>
                </>
              )}

              {status === "active" && (
                <Popconfirm
                  title="Deactivate Account"
                  description={`Deactivate ${record?.name}? They will not be able to login.`}
                  onConfirm={() => onDeactivate?.(userId)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <button
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border transition hover:bg-muted/80 disabled:opacity-50"
                  >
                    <Lock size={13} />
                    Deactivate
                  </button>
                </Popconfirm>
              )}

              <Popconfirm
                title="Delete Account"
                description={`Delete ${record?.name}? This action cannot be undone.`}
                onConfirm={() => onDelete?.(userId)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <button
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-700 dark:hover:bg-red-950/60"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </Popconfirm>
            </div>
          );
        },
      },
    ],
    [onRoleChange, onApprove, onDeactivate, onDelete, updatingById],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table
        rowKey={(row) => row._id}
        dataSource={Array.isArray(users) ? users : []}
        columns={columns}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          className: "px-4 pb-2",
        }}
        scroll={{ x: 1050 }}
        rowClassName="hover:bg-muted/30 transition-colors"
      />
    </div>
  );
};

export default SuperadminUsersTable;
