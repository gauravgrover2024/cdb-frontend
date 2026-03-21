import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, message, Spin } from "antd";
import { fetchUsers, updateUserRole, approveUser, deactivateUser, deleteUser } from "../../api/users";
import SuperadminUsersTable from "../../components/ui/SuperadminUsersTable";

const ROLE_SEARCH_MIN_CHARS = 0;

/**
 * Super admin page: show all users and allow role management.
 *
 * Purpose: Provide user governance UI for superadmins only.
 * @returns {JSX.Element}
 */
const SuperadminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");

  const [updatingById, setUpdatingById] = useState({});

  const token = sessionStorage.getItem("token");

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
      const nextUsers = Array.isArray(res?.data) ? res.data : [];
      setUsers(nextUsers);
    } catch (err) {
      console.error("[SuperadminUsersPage] fetchUsers error:", err);
      setFetchError(err?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (q.length <= ROLE_SEARCH_MIN_CHARS) return users;
    return users.filter((u) => {
      const name = String(u?.name || "").toLowerCase();
      const email = String(u?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || String(u?.role || "").toLowerCase().includes(q);
    });
  }, [users, search]);

  const handleRoleChange = useCallback(
    async (userId, nextRole) => {
      if (!token) return;
      if (!userId) return;

      setUpdatingById((prev) => ({ ...prev, [userId]: true }));
      try {
        const res = await updateUserRole(userId, nextRole, token);
        const updatedUser = res?.data;

        setUsers((prev) =>
          prev.map((u) => {
            if (String(u?._id) !== String(userId)) return u;
            if (updatedUser?.role) return { ...u, role: updatedUser.role };
            return { ...u, role: nextRole };
          }),
        );
        message.success("Role updated successfully");
      } catch (err) {
        console.error("[SuperadminUsersPage] updateUserRole error:", err);
        message.error(err?.message || "Failed to update role");
        loadUsers();
      } finally {
        setUpdatingById((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    },
    [token, loadUsers],
  );

  const handleApprove = useCallback(
    async (userId, status) => {
      if (!token) return;
      if (!userId) return;

      setUpdatingById((prev) => ({ ...prev, [userId]: true }));
      try {
        const res = await approveUser(userId, status, token);
        const updatedUser = res?.data;

        setUsers((prev) =>
          prev.map((u) => {
            if (String(u?._id) !== String(userId)) return u;
            if (updatedUser?.status) return { ...u, status: updatedUser.status };
            return { ...u, status };
          }),
        );
        const statusText = status === "active" ? "approved" : "rejected";
        message.success(`User ${statusText} successfully`);
      } catch (err) {
        console.error("[SuperadminUsersPage] approveUser error:", err);
        message.error(err?.message || "Failed to update user status");
        loadUsers();
      } finally {
        setUpdatingById((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    },
    [token, loadUsers],
  );

  const handleDeactivate = useCallback(
    async (userId) => {
      if (!token) return;
      if (!userId) return;

      setUpdatingById((prev) => ({ ...prev, [userId]: true }));
      try {
        const res = await deactivateUser(userId, token);
        const updatedUser = res?.data;

        setUsers((prev) =>
          prev.map((u) => {
            if (String(u?._id) !== String(userId)) return u;
            if (updatedUser?.status) return { ...u, status: updatedUser.status };
            return { ...u, status: "deactivated" };
          }),
        );
        message.success("User account deactivated successfully");
      } catch (err) {
        console.error("[SuperadminUsersPage] deactivateUser error:", err);
        message.error(err?.message || "Failed to deactivate user");
        loadUsers();
      } finally {
        setUpdatingById((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    },
    [token, loadUsers],
  );

  const handleDelete = useCallback(
    async (userId) => {
      if (!token) return;
      if (!userId) return;

      setUpdatingById((prev) => ({ ...prev, [userId]: true }));
      try {
        await deleteUser(userId, token);

        setUsers((prev) => prev.filter((u) => String(u?._id) !== String(userId)));
        message.success("User account deleted successfully");
      } catch (err) {
        console.error("[SuperadminUsersPage] deleteUser error:", err);
        message.error(err?.message || "Failed to delete user");
        loadUsers();
      } finally {
        setUpdatingById((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    },
    [token, loadUsers],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts, roles, approvals, and deletions. Changes take effect immediately.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role"
            className="w-full sm:w-72"
          />
          <Button onClick={loadUsers} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {fetchError ? (
        <Alert type="error" showIcon message={fetchError} />
      ) : null}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Spin />
        </div>
      ) : null}

      <SuperadminUsersTable
        users={filteredUsers}
        loading={loading}
        updatingById={updatingById}
        onRoleChange={handleRoleChange}
        onApprove={handleApprove}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default SuperadminUsersPage;

