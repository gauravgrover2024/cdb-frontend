import React, { useMemo } from "react";
import { Select, Table, Tag, Button, Space, Popconfirm } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, LockOutlined, DeleteOutlined } from "@ant-design/icons";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

const roleTagTone = (role) => {
  switch (role) {
    case "superadmin":
      return "gold";
    case "admin":
      return "blue";
    case "staff":
      return "green";
    default:
      return "default";
  }
};

const statusTagTone = (status) => {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    case "deactivated":
      return "default";
    default:
      return "default";
  }
};

/**
 * Super admin users table with role update control and account approval.
 *
 * Purpose: display all users with status and allow superadmin to change role and approve/reject accounts.
 * @param {Object} props
 * @param {Array<{_id: string, name: string, email: string, role: string, status: string}>} props.users
 * @param {boolean} props.loading
 * @param {Record<string, boolean>} props.updatingById
 * @param {(userId: string, nextRole: string) => Promise<void>|void} props.onRoleChange
 * @param {(userId: string, status: string) => Promise<void>|void} props.onApprove
 * @param {(userId: string) => Promise<void>|void} props.onDeactivate
 * @param {(userId: string) => Promise<void>|void} props.onDelete
 */
const SuperadminUsersTable = ({ users, loading, updatingById, onRoleChange, onApprove, onDeactivate, onDelete }) => {
  const columns = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: 160,
        render: (value) => <span className="font-semibold">{value || "—"}</span>,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: 220,
        render: (value) => <span className="text-muted-foreground text-sm">{value || "—"}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (value) => (
          <Tag color={statusTagTone(value || "pending")}>
            {(value || "pending").charAt(0).toUpperCase() + (value || "pending").slice(1)}
          </Tag>
        ),
      },
      {
        title: "Role",
        dataIndex: "role",
        key: "role",
        width: 180,
        render: (_, record) => {
          const userId = record?._id;
          const isUpdating = Boolean(updatingById?.[userId]);
          return (
            <div className="flex items-center gap-2">
              <Tag color={roleTagTone(record?.role)}>{record?.role || "—"}</Tag>
              <Select
                value={record?.role}
                size="small"
                disabled={isUpdating}
                options={ROLE_OPTIONS}
                style={{ width: 130 }}
                onChange={(nextRole) => onRoleChange?.(userId, nextRole)}
              />
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 300,
        render: (_, record) => {
          const userId = record?._id;
          const status = record?.status || "pending";
          const isUpdating = Boolean(updatingById?.[userId]);

          return (
            <Space size="small" wrap>
              {/* Approve/Reject buttons for pending accounts */}
              {status === "pending" && (
                <>
                  <Popconfirm
                    title="Approve Account"
                    description={`Approve ${record?.name}? Their account will be activated immediately.`}
                    onConfirm={() => onApprove?.(userId, "active")}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      disabled={isUpdating}
                      loading={isUpdating}
                    >
                      Approve
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Reject Account"
                    description={`Reject ${record?.name}? They will not be able to access the system.`}
                    onConfirm={() => onApprove?.(userId, "rejected")}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      disabled={isUpdating}
                      loading={isUpdating}
                    >
                      Reject
                    </Button>
                  </Popconfirm>
                </>
              )}

              {/* Deactivate button for active accounts */}
              {status === "active" && (
                <Popconfirm
                  title="Deactivate Account"
                  description={`Deactivate ${record?.name}? They will not be able to login.`}
                  onConfirm={() => onDeactivate?.(userId)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    icon={<LockOutlined />}
                    disabled={isUpdating}
                    loading={isUpdating}
                  >
                    Deactivate
                  </Button>
                </Popconfirm>
              )}

              {/* Delete button for all users */}
              <Popconfirm
                title="Delete Account"
                description={`Delete ${record?.name}? This action cannot be undone and all their data will be permanently removed.`}
                onConfirm={() => onDelete?.(userId)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={isUpdating}
                  loading={isUpdating}
                >
                  Delete
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [onRoleChange, onApprove, onDeactivate, onDelete, updatingById],
  );

  return (
    <Table
      rowKey={(row) => row._id}
      dataSource={Array.isArray(users) ? users : []}
      columns={columns}
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
      scroll={{ x: 1200 }}
    />
  );
};

export default SuperadminUsersTable;

