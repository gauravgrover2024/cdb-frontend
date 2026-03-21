import React, { useState, useEffect } from "react";
import { Button, Input, message, Table, Space, Modal } from "antd";
import { Plus } from "lucide-react";
import { channelsApi } from "../../api/channels";

/**
 * Superadmin page: Manage all channels
 * Features: Create, Edit, Delete, View all channels
 */
const SuperadminChannelsPage = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInputText, setSearchInputText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactPerson: "",
    email: "",
  });
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Load channels with pagination
  const loadChannels = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * 20;
      const res = await channelsApi.getAll({ skip, limit: 20, q: search });
      const data = res?.data || [];
      const total = res?.count || 0;
      setChannels(Array.isArray(data) ? data : []);
      setPagination({ current: page, pageSize: 20, total });
    } catch (error) {
      console.error("Error loading channels:", error);
      message.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputText(value);

    // Clear existing timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Debounce search - 300ms delay
    const timeout = setTimeout(() => {
      loadChannels(1, value);
    }, 300);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadChannels(1, "");
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  // Handle add/edit
  const handleSave = async () => {
    if (!formData.name) {
      message.error("Channel name required");
      return;
    }

    try {
      if (editingChannel) {
        await channelsApi.update(editingChannel._id, formData);
        message.success("Updated successfully");
      } else {
        await channelsApi.create(formData);
        message.success("Created successfully");
      }
      setIsModalVisible(false);
      setEditingChannel(null);
      setFormData({ name: "", description: "", contactPerson: "", email: "" });
      loadChannels(pagination.current, searchInputText);
    } catch (error) {
      console.error("Error saving channel:", error);
      message.error(error?.message || "Error saving channel");
    }
  };

  // Handle delete
  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Channel",
      content: "Are you sure you want to delete this channel?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await channelsApi.delete(id);
          message.success("Deleted successfully");
          loadChannels(pagination.current, searchInputText);
        } catch (error) {
          console.error("Error deleting channel:", error);
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: "25%",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: "25%",
      render: (text) => text?.substring(0, 30) + (text?.length > 30 ? "..." : ""),
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      key: "contactPerson",
      width: "20%",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: "20%",
      render: (text) => text?.substring(0, 20) + (text?.length > 20 ? "..." : ""),
    },
    {
      title: "Actions",
      key: "actions",
      width: "10%",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setEditingChannel(record);
              setFormData(record);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-black text-foreground">Channel Management</h2>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            setEditingChannel(null);
            setFormData({ name: "", description: "", contactPerson: "", email: "" });
            setIsModalVisible(true);
          }}
        >
          New Channel
        </Button>
      </div>

      <Input
        placeholder="Search by name or contact person..."
        value={searchInputText}
        onChange={handleSearchChange}
        className="w-full"
      />

      <Table
        columns={columns}
        dataSource={channels}
        loading={loading}
        rowKey="_id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => loadChannels(page, searchInputText),
        }}
      />

      {/* Modal for add/edit */}
      <Modal
        title={editingChannel ? "Edit Channel" : "New Channel"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
      >
        <div className="space-y-4">
          <Input
            placeholder="Channel Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input.TextArea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
          />
          <Input
            placeholder="Contact Person"
            value={formData.contactPerson}
            onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
          />
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SuperadminChannelsPage;
