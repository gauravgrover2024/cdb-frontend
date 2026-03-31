// src/modules/shared/DirectCreateModal.jsx
import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { deliveryOrdersApi } from "../../api/deliveryOrders";
import { paymentsApi } from "../../api/payments";

const { Option } = Select;

const DirectCreateModal = ({ open, mode, onClose, onCreated }) => {
  // mode: "DO" | "PAYMENT"
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        customerName: values.customerName,
        primaryMobile: values.primaryMobile,
        vehicleMake: values.vehicleMake || "",
        vehicleModel: values.vehicleModel || "",
        vehicleVariant: values.vehicleVariant || "",
        typeOfLoan: values.typeOfLoan || "New Car",
        isFinanced: values.isFinanced || "Yes",
        dealerName: values.dealerName || "",
      };

      let res;
      if (mode === "DO") {
        res = await deliveryOrdersApi.createDirect(payload);
      } else {
        res = await paymentsApi.createDirect(payload);
      }

      const loanId = res?.data?.loanId || res?.loanId;
      message.success(`Loan file ${loanId} created ✅`);
      form.resetFields();
      onClose();
      if (onCreated) onCreated(loanId);

      // Navigate to the newly created record
      if (mode === "DO") {
        navigate(`/delivery-orders/${loanId}`);
      } else {
        navigate(`/payments/${loanId}`);
      }
    } catch (err) {
      if (err?.errorFields) return; // validation error, antd handles it
      message.error(err?.response?.data?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "DO" ? "Create New Delivery Order" : "Create New Payment"}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={[
        <Button key="cancel" onClick={() => { form.resetFields(); onClose(); }}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Create & Open
        </Button>,
      ]}
      centered
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-2">
        <Form.Item
          name="customerName"
          label="Customer Name"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input placeholder="Full name" />
        </Form.Item>

        <Form.Item
          name="primaryMobile"
          label="Mobile Number"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input placeholder="10-digit mobile" maxLength={10} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="vehicleMake" label="Make">
            <Input placeholder="e.g. Maruti" />
          </Form.Item>
          <Form.Item name="vehicleModel" label="Model">
            <Input placeholder="e.g. Swift" />
          </Form.Item>
        </div>

        <Form.Item name="vehicleVariant" label="Variant">
          <Input placeholder="e.g. VXI" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="typeOfLoan" label="Case Type" initialValue="New Car">
            <Select>
              <Option value="New Car">New Car</Option>
              <Option value="New Car Cash">New Car Cash</Option>
            </Select>
          </Form.Item>

          <Form.Item name="isFinanced" label="Finance" initialValue="Yes">
            <Select>
              <Option value="Yes">Financed</Option>
              <Option value="No">Cash</Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item name="dealerName" label="Dealer / Showroom Name">
          <Input placeholder="Showroom name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DirectCreateModal;
