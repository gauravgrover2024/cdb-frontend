import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Spin, message } from "antd";
import { Search, RefreshCw, Users } from "lucide-react";
import { fetchUsers, updateUserRole, approveUser, deactivateUser, deleteUser } from "../../api/users";
import SuperadminUsersTable from "../../components/ui/SuperadminUsersTable";

const ROLE_SEARCH_MIN_CHARS = 0;

const SuperadminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingById, setUpdatingById] = useState({});

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const loadUsers = useCallback(async () => {
    if (!token) {
      setFetchError("Missing auth token. Please login again.");
      setUsers([]);
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetchUsers(token);
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFetchError(err?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (q.length <= ROLE_SEARCH_MIN_CHARS) return users;
    return users.filter((u) =>
      String(u?.name || "").toLowerCase().includes(q) ||
      String(u?.email || "").toLowerCase().includes(q) ||
      String(u?.role || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleRoleChange = useCallback(async (userId, nextRole) => {
    if (!token || !userId) return;
    setUpdatingById((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await updateUserRole(userId, nextRole, token);
      const updatedUser = res?.data;
      setUsers((prev) => prev.map((u) =>
        String(u?._id) !== String(userId) ? u :
        { ...u, role: updatedUser?.role || nextRole }
      ));
      message.success("Role updated successfully");
    } catch (err) {
      message.error(err?.message || "Failed to update role");
      loadUsers();
    } finally {
      setUpdatingById((prev) => { const c = { ...prev }; delete c[userId]; return c; });
    }
  }, [token, loadUsers]);

  const handleApprove = useCallback(async (userId, status) => {
    if (!token || !userId) return;
    setUpdatingById((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await approveUser(userId, status, token);
      const updatedUser = res?.data;
      setUsers((prev) => prev.map((u) =>
        String(u?._id) !== String(userId) ? u :
        { ...u, status: updatedUser?.status || status }
      ));
      message.success(`User ${status === "active" ? "approved" : "rejected"} successfully`);
    } catch (err) {
      message.error(err?.message || "Failed to update user status");
      loadUsers();
    } finally {
      setUpdatingById((prev) => { const c = { ...prev }; delete c[userId]; return c; });
    }
  }, [token, loadUsers]);

  const handleDeactivate = useCallback(async (userId) => {
    if (!token || !userId) return;
    setUpdatingById((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await deactivateUser(userId, token);
      const updatedUser = res?.data;
      setUsers((prev) => prev.map((u) =>
        String(u?._id) !== String(userId) ? u :
        { ...u, status: updatedUser?.status || "deactivated" }
      ));
      message.success("User account deactivated successfully");
    } catch (err) {
      message.error(err?.message || "Failed to deactivate user");
      loadUsers();
    } finally {
      setUpdatingById((prev) => { const c = { ...prev }; delete c[userId]; return c; });
    }
  }, [token, loadUsers]);

  const handleDelete = useCallback(async (userId) => {
    if (!token || !userId) return;
    setUpdatingById((prev) => ({ ...prev, [userId]: true }));
    try {
      await deleteUser(userId, token);
      setUsers((prev) => prev.filter((u) => String(u?._id) !== String(userId)));
      message.success("User account deleted successfully");
    } catch (err) {
      message.error(err?.message || "Failed to delete user");
      loadUsers();
    } finally {
      setUpdatingById((prev) => { const c = { ...prev }; delete c[userId]; return c; });
    }
  }, [token, loadUsers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">User Management</h2>
              {!loading && users.length > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {users.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage accounts, roles, approvals and deletions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or role…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 sm:w-72"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {fetchError && <Alert type="error" showIcon message={fetchError} className="rounded-xl" />}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Spin size="large" />
            <p className="text-sm text-muted-foreground">Loading users…</p>
          </div>
        </div>
      ) : (
        <>
          {search && (
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredUsers.length}</span> of{" "}
              <span className="font-semibold text-foreground">{users.length}</span> users
            </p>
          )}
          <SuperadminUsersTable
            users={filteredUsers}
            loading={loading}
            updatingById={updatingById}
            onRoleChange={handleRoleChange}
            onApprove={handleApprove}
            onDeactivate={handleDeactivate}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
};

export default SuperadminUsersPage;
